from flask import Blueprint, request, make_response, flash
import xml.etree.ElementTree as ET
from basyx.aas.compliance_tool import compliance_check_aasx
from basyx.aas.compliance_tool import compliance_check_xml as compliance_tool_xml, \
    compliance_check_json as compliance_tool_json, compliance_check_aasx as compliance_tool_aasx
from basyx.aas.adapter.json import write_aas_json_file
from basyx.aas.adapter.xml import write_aas_xml_file
from basyx.aas.adapter.aasx import AASXReader, DictSupplementaryFileContainer
from basyx.aas.examples.data import create_example, create_example_aas_binding, TEST_PDF_FILE
from basyx.aas.compliance_tool.state_manager import ComplianceToolStateManager, Status
from basyx.aas.model import DictObjectStore
import tempfile
import os

def get_aasx_id(file_content):
  root = ET.fromstring(file_content)
  #the tag name has a namespace "<aas:capability>"
  #therefore we need to take the namespace definiton from the first lines of the xml
  #xmlns:aas='{http://www.admin-shell.io/aas/2/0}'
  ns='{http://www.admin-shell.io/aas/2/0}' #namespace definition
  aasids = []
  for aas in root.iter(ns+'assetAdministrationShell'):
      aasids.append(aas.find(ns+'identification').text)
  return aasids

def get_all_aas_capabilities(file_content):
  root = ET.fromstring(file_content)
  capabilities = []
  #the tag name has a namespace "<aas:capability>"
  #therefore we need to take the namespace definiton from the first lines of the xml
  #xmlns:aas='{http://www.admin-shell.io/aas/2/0}'
  ns='{http://www.admin-shell.io/aas/2/0}' #namespace definition
  
  for capability in root.iter(ns+'capability'):
      capabilities.append({
                          "ID" : capability.find(ns+'idShort').text,
                          "IRI":capability.find(ns+'semanticId').find(ns+'keys').find(ns+'key').text
                          })
  return capabilities

def parse_aas_equipment_info(file_content):
    """Extract equipment information from AAS file for PropertyWindow display"""
    root = ET.fromstring(file_content)
    ns = '{http://www.admin-shell.io/aas/2/0}'
    
    equipment_info = {
        "aas_id": None,
        "asset_id": None,
        "capabilities": [],
        "properties": [],
        "operations": []
    }
    
    # Extract AAS ID
    aas_elem = root.find(ns+'assetAdministrationShell')
    if aas_elem is not None:
        identification = aas_elem.find(ns+'identification')
        if identification is not None and hasattr(identification, 'text'):
            equipment_info["aas_id"] = identification.text
    
    # Extract Asset ID
    asset_elem = root.find(ns+'asset')
    if asset_elem is not None:
        asset_id = asset_elem.find(ns+'identification')
        if asset_id is not None and hasattr(asset_id, 'text'):
            equipment_info["asset_id"] = asset_id.text
    
    # Extract Capabilities
    for capability in root.iter(ns+'capability'):
        cap_info = {
            "id": None,
            "semantic_id": None
        }
        id_short = capability.find(ns+'idShort')
        if id_short is not None and hasattr(id_short, 'text'):
            cap_info["id"] = id_short.text
        semantic_id = capability.find(ns+'semanticId')
        if semantic_id is not None:
            keys = semantic_id.find(ns+'keys')
            if keys is not None:
                key = keys.find(ns+'key')
                if key is not None and hasattr(key, 'text'):
                    cap_info["semantic_id"] = key.text
        equipment_info["capabilities"].append(cap_info)
    
    # Extract Properties
    for property_elem in root.iter(ns+'property'):
        prop_info = {
            "id": None,
            "value": None,
            "data_type": None
        }
        id_short = property_elem.find(ns+'idShort')
        if id_short is not None and hasattr(id_short, 'text'):
            prop_info["id"] = id_short.text
        value = property_elem.find(ns+'value')
        if value is not None and hasattr(value, 'text'):
            prop_info["value"] = value.text
        data_type = property_elem.find(ns+'valueType')
        if data_type is not None and hasattr(data_type, 'text'):
            prop_info["data_type"] = data_type.text
        equipment_info["properties"].append(prop_info)
    
    # Extract Operations
    for operation in root.iter(ns+'operation'):
        op_info = {
            "id": None,
            "input_variables": [],
            "output_variables": []
        }
        
        # Extract input variables
        for input_var in operation.iter(ns+'inputVariable'):
            var_info = {
                "id": None,
                "value": None
            }
            id_short = input_var.find(ns+'idShort')
            if id_short is not None and hasattr(id_short, 'text'):
                var_info["id"] = id_short.text
            value = input_var.find(ns+'value')
            if value is not None and hasattr(value, 'text'):
                var_info["value"] = value.text
            op_info["input_variables"].append(var_info)
        
        # Extract output variables
        for output_var in operation.iter(ns+'outputVariable'):
            var_info = {
                "id": None,
                "value": None
            }
            id_short = output_var.find(ns+'idShort')
            if id_short is not None and hasattr(id_short, 'text'):
                var_info["id"] = id_short.text
            value = output_var.find(ns+'value')
            if value is not None and hasattr(value, 'text'):
                var_info["value"] = value.text
            op_info["output_variables"].append(var_info)
        
        equipment_info["operations"].append(op_info)
    
    return equipment_info
        
def get_all_aasx_capabilities(file_contents):
    with tempfile.NamedTemporaryFile(mode='wb+', delete=False) as temp_file:
        temp_file.write(file_contents)
        temp_file_path = temp_file.name
    objects = DictObjectStore()
    files = DictSupplementaryFileContainer()
    with AASXReader(temp_file_path) as reader:
        meta_data = reader.get_core_properties()
        reader.read_into(objects, files)
        with tempfile.NamedTemporaryFile(mode='wb+', delete=False) as temp_file:
          write_aas_xml_file(temp_file, objects)
          temp_file_path = temp_file.name
          print(temp_file_path)
          file_content = temp_file.read()
        print("###########################################")
        print(file_content)
    capabilities = get_all_aas_capabilities(file_content)
    return capabilities
aas_api = Blueprint('aas_api', __name__)

@aas_api.route('/AASX/capabilities', methods=['POST'])
def get_aasx_capabilities():
    """Endpoint to get availible Capabilities from a AASX.
    ---
    tags:
      - AAS
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    responses:
      200:
        description: An ackknowledgement that the upload worked.
        examples:
            rgb: ['red', 'green', 'blue']
    """
        # check if the post request has the file part
    if 'file' not in request.files:
      print("no file given")
      flash('No file part')
      return make_response(request.url, 400)
    file = request.files['file']
    file_content = file.read()
    capabilities = get_all_aasx_capabilities(file_content)
    return capabilities
  
@aas_api.route('/AAS/capabilities', methods=['POST'])
def get_aas_capabilities():
    """Endpoint to get availible Capabilities from a AASX.
    ---
    tags:
      - AAS
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    responses:
      200:
        description: An ackknowledgement that the upload worked.
        examples:
            rgb: ['red', 'green', 'blue']
    """
        # check if the post request has the file part
    if 'file' not in request.files:
      print("no file given")
      flash('No file part')
      return make_response(request.url, 400)
    file = request.files['file']
    file_content = file.read()
    capabilities = get_all_aasx_capabilities(file_content)
    return capabilities
  
@aas_api.route('/AASX/validate', methods=['POST'])
def validate_aasx():
    """Endpoint to validate a AASX.
    ---
    tags:
      - AAS
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    responses:
      200:
        description: Boolean showing if AASX is valid or not.
        examples:
            rgb: True
    """
    if 'file' not in request.files:
      print("no file given")
      flash('No file part')
      return make_response(request.url, 400)
    file = request.files['file']
    file_content = file.read()
    stateManager = ComplianceToolStateManager()
    
    with tempfile.NamedTemporaryFile(mode='wb+', delete=False) as temp_file:
        temp_file.write(file_content)
        temp_file_path = temp_file.name
    try:
        compliance_tool_aasx.check_schema(temp_file_path, stateManager) 
    except Exception as e:
      # Handle the exception here
      print(f"An error occurred: {e}")
      # You can also log the error or take any other appropriate action
      return make_response(str(e), 400)
    finally:
        # Clean up: delete the temporary file
        os.remove(temp_file_path) 
    return make_response("True", 200)
    
@aas_api.route('/AAS/validate', methods=['POST'])
def validate_aas():
    """Endpoint to validate a AAS.
    ---
    tags:
      - AAS
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    responses:
      200:
        description: Boolean showing if AAS is valid or not.
        examples:
            rgb: True
    """
    if 'file' not in request.files:
      print("no file given")
      flash('No file part')
      return make_response(request.url, 400)
    file = request.files['file']
    file_content = file.read()
    stateManager = ComplianceToolStateManager()
    
    with tempfile.NamedTemporaryFile(mode='wb+', delete=False) as temp_file:
        temp_file.write(file_content)
        temp_file_path = temp_file.name
    try:
        compliance_tool_xml.check_schema(temp_file_path, stateManager) 
    except Exception as e:
      # Handle the exception here
      print(f"An error occurred: {e}")
      # You can also log the error or take any other appropriate action
      return make_response(str(e), 400)
    finally:
        # Clean up: delete the temporary file
        os.remove(temp_file_path) 
    return make_response("True", 200)
 