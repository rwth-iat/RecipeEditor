from flask import Blueprint, request, make_response, flash, jsonify
import os
import xml.etree.ElementTree as ET
from lxml import etree
from django.utils.encoding import iri_to_uri, uri_to_iri
import json
try:
    from dicttoxml import dicttoxml
except ImportError:
    # Fallback if dicttoxml is not installed
    def dicttoxml(data, custom_root="", attr_type=False):
        return "<xml>dicttoxml not available</xml>"
from typing import Tuple

recipe_api = Blueprint('recipe_api', __name__)

def validate(xml_string: str, xsd_relpath: str) -> Tuple[bool, str]:
    # 1) Locate the XSD file next to this .py
    
    here = os.path.dirname(__file__)
    xsd_path = os.path.join(here, xsd_relpath)

    # 2) Load/compile the schema
    try:
        schema_doc = etree.parse(xsd_path)
        schema     = etree.XMLSchema(schema_doc)
    except Exception as e:
        return False, f"XSD load/compile error: {e}"

    # 3) Parse your XML payload
    try:
        xml_doc = etree.fromstring(xml_string.encode('utf-8'))
    except Exception as e:
        return False, f"XML parse error: {e}"

    # 4) Validate against the schema
    try:
        schema.assertValid(xml_doc)
        return True, ""
    except etree.DocumentInvalid as e:
        # This exception's message includes line numbers & failure reasons
        return False, str(e)

def get_all_recipe_capabilities(file_content):
  root = ET.fromstring(file_content)
  capabilities = []
  #the tag name has a namespace "<aas:capability>"
  #therefore we need to take the namespace definiton from the first lines of the xml
  #xmlns:aas='{http://www.admin-shell.io/aas/2/0}'
  ns='{http://www.mesa.org/xml/B2MML}' #namespace definition
  
  for processElement in root.iter(ns+'ProcessElement'):
      otherInfos = processElement.findall(ns+'OtherInformation') 
      if otherInfos is None or []:
          continue
      for otherInfo in otherInfos:
          otherInfoId = otherInfo.find(ns+'OtherInfoID')
          if otherInfoId is not None and otherInfoId.text == "SemanticDescription":
              otherValue = otherInfo.find(ns+'OtherValue')
              if otherValue is not None:
                  valueString = otherValue.find(ns+'ValueString')
                  if valueString is not None and valueString.text is not None:
                      id_element = processElement.find(ns+'ID')
                      if id_element is not None and id_element.text is not None:
                          capabilities.append({
                                          "ID": id_element.text,                   
                                          "IRI": uri_to_iri(valueString.text)
                                      })
  return capabilities

@recipe_api.route('/grecipe/validate')
def validate_batchml():
    """Endpoint to validate a xml string against BatchML xsd schema.
    ---
    tags:
      - Recipes
    parameters:
      - name: xml_string
        in: query
        type: string
        required: true
        default: ""
    responses:
      200:
        description: Given String is valid.
        400:
        description: Given String is not valid.
    """
    args = request.args
    xml_string = args.get("xml_string", type=str)
    if not xml_string:
        xml_string = ""
    print(xml_string)

    valid, error = validate(xml_string, "batchml_schemas/schemas/BatchML-GeneralRecipe.xsd")   
    if valid:
        print('Valid! :)')
        response = make_response("valid!", 200)
        return response
    else:
        print('Not valid! :(')
        response = make_response(error, 400)
        return response
      
@recipe_api.route('/mrecipe/validate', methods=['POST'])
def validate_mrecipe_post():
    """
    Validate a Master-Recipe JSON payload by converting to XML and validating against the BatchInformation XSD.
    ---
    tags:
      - Recipes
    parameters:
      - name: payload
        in: body
        type: object
        required: true
    responses:
      200:
        description: Valid XML
      400:
        description: Schema validation failure
      500:
        description: Internal parse/XSD load error
    """
    try:
        # Get JSON payload from request
        json_data = request.get_json()
        if not json_data:
            return make_response("No JSON payload provided", 400)
        
        # Convert JSON to XML
        xml_string = convert_json_to_batchml_xml(json_data)
        
        # Validate the XML
        ok, err = validate(
            xml_string,
            "batchml_schemas/schemas/BatchML-BatchInformation.xsd"
        )
        
        if ok:
            # Return the generated XML for download
            response = make_response(xml_string, 200)
            response.headers['Content-Type'] = 'application/xml'
            return response
        else:
            # Return validation error
            return make_response(err, 400)
            
    except Exception as e:
        return make_response(f"Internal error: {str(e)}", 500)

@recipe_api.route('/mrecipe/validate')
def validate_mrecipe():
    """
    Validate a Master-Recipe XML string against the BatchInformation XSD.
    ---
    tags:
      - Recipes
    parameters:
      - name: xml_string
        in: query
        type: string
        required: true
    responses:
      200:
        description: Valid XML
      400:
        description: Schema validation failure
      500:
        description: Internal parse/XSD load error
    """
    xml_string = request.args.get("xml_string", "")
    if not xml_string:
        xml_string = ""
    ok, err = validate(
        xml_string,
        "batchml_schemas/schemas/BatchML-BatchInformation.xsd"
    )

    if ok:
        return make_response("valid!", 200)
    # treat parse/XSD-load errors as 500
    elif err.startswith("XSD load") or err.startswith("XML parse"):
        return make_response(err, 500)
    # schema failures as 400
    else:
        return make_response(err, 400)

@recipe_api.route('/recipes/capabilities', methods=['POST']) 
def get_recipe_capabilities():
    """Endpoint to get capabilitys form a server.
    ---
    tags:
      - Recipes 
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
    capabilities = get_all_recipe_capabilities(file_content)
    response = make_response(capabilities)
    return response

def convert_json_to_batchml_xml(json_data):
    """Convert the enhanced JSON payload to B2MML XML format using ElementTree"""
    print("Received JSON for conversion:", json.dumps(json_data, indent=2))

    # Namespaces
    NS_B2MML = "http://www.mesa.org/xml/B2MML"
    NS_XSI = "http://www.w3.org/2001/XMLSchema-instance"
    NSMAP = {
        'b2mml': NS_B2MML,
        'xsi': NS_XSI
    }
    ET.register_namespace('b2mml', NS_B2MML)
    ET.register_namespace('xsi', NS_XSI)

    # Root element
    root = ET.Element('{%s}BatchInformation' % NS_B2MML, {
        '{%s}schemaLocation' % NS_XSI: 'http://www.mesa.org/xml/B2MML Schema/AllSchemas.xsd',
    })

    # ListHeader
    list_header = json_data.get('listHeader', {})
    el_list_header = ET.SubElement(root, '{%s}ListHeader' % NS_B2MML)
    ET.SubElement(el_list_header, '{%s}ID' % NS_B2MML).text = list_header.get('id', 'ListHeadID')
    ET.SubElement(el_list_header, '{%s}CreateDate' % NS_B2MML).text = list_header.get('createDate', '')

    # Description
    ET.SubElement(root, '{%s}Description' % NS_B2MML).text = json_data.get('description', '')

    # MasterRecipe
    mr = json_data.get('masterRecipe', {})
    el_mr = ET.SubElement(root, '{%s}MasterRecipe' % NS_B2MML)
    ET.SubElement(el_mr, '{%s}ID' % NS_B2MML).text = mr.get('id', 'MasterRecipe')
    ET.SubElement(el_mr, '{%s}Version' % NS_B2MML).text = mr.get('version', '1.0.0')
    ET.SubElement(el_mr, '{%s}VersionDate' % NS_B2MML).text = mr.get('versionDate', '')
    ET.SubElement(el_mr, '{%s}Description' % NS_B2MML).text = mr.get('description', '')

    # Header
    header = mr.get('header', {})
    el_header = ET.SubElement(el_mr, '{%s}Header' % NS_B2MML)
    ET.SubElement(el_header, '{%s}ProductID' % NS_B2MML).text = header.get('productId', '')
    ET.SubElement(el_header, '{%s}ProductName' % NS_B2MML).text = header.get('productName', '')

    # EquipmentRequirement
    for eq in mr.get('equipmentRequirement', []):
        el_eq = ET.SubElement(el_mr, '{%s}EquipmentRequirement' % NS_B2MML)
        ET.SubElement(el_eq, '{%s}ID' % NS_B2MML).text = eq.get('b2mml:ID', '')
        constraint = eq.get('b2mml:Constraint', {})
        if constraint:
            el_constraint = ET.SubElement(el_eq, '{%s}Constraint' % NS_B2MML)
            ET.SubElement(el_constraint, '{%s}ID' % NS_B2MML).text = constraint.get('b2mml:ID', '')
            ET.SubElement(el_constraint, '{%s}Condition' % NS_B2MML).text = constraint.get('b2mml:Condition', '')
        ET.SubElement(el_eq, '{%s}Description' % NS_B2MML).text = eq.get('b2mml:Description', '')

    # Formula
    formula = mr.get('formula', {})
    if formula:
        el_formula = ET.SubElement(el_mr, '{%s}Formula' % NS_B2MML)
        for param in formula.get('parameter', []):
            el_param = ET.SubElement(el_formula, '{%s}Parameter' % NS_B2MML)
            ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
            ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')
            ET.SubElement(el_param, '{%s}ParameterSubType' % NS_B2MML).text = param.get('b2mml:ParameterSubType', '')
            value = param.get('b2mml:Value', {})
            if value:
                el_value = ET.SubElement(el_param, '{%s}Value' % NS_B2MML)
                ET.SubElement(el_value, '{%s}ValueString' % NS_B2MML).text = value.get('b2mml:ValueString', '')
                ET.SubElement(el_value, '{%s}DataInterpretation' % NS_B2MML).text = value.get('b2mml:DataInterpretation', '')
                ET.SubElement(el_value, '{%s}DataType' % NS_B2MML).text = value.get('b2mml:DataType', '')
                ET.SubElement(el_value, '{%s}UnitOfMeasure' % NS_B2MML).text = value.get('b2mml:UnitOfMeasure', '')

    # ProcedureLogic (optional, simplified)
    procedure_logic = mr.get('procedureLogic', {})
    if procedure_logic:
        el_proc_logic = ET.SubElement(el_mr, '{%s}ProcedureLogic' % NS_B2MML)
        for link in procedure_logic.get('link', []):
            el_link = ET.SubElement(el_proc_logic, '{%s}Link' % NS_B2MML)
            ET.SubElement(el_link, '{%s}ID' % NS_B2MML).text = link.get('b2mml:ID', '')
            from_id = link.get('b2mml:FromID', {})
            if from_id:
                el_from = ET.SubElement(el_link, '{%s}FromID' % NS_B2MML)
                ET.SubElement(el_from, '{%s}FromIDValue' % NS_B2MML).text = from_id.get('b2mml:FromIDValue', '')
                ET.SubElement(el_from, '{%s}FromType' % NS_B2MML).text = from_id.get('b2mml:FromType', '')
                ET.SubElement(el_from, '{%s}IDScope' % NS_B2MML).text = from_id.get('b2mml:IDScope', '')
            to_id = link.get('b2mml:ToID', {})
            if to_id:
                el_to = ET.SubElement(el_link, '{%s}ToID' % NS_B2MML)
                ET.SubElement(el_to, '{%s}ToIDValue' % NS_B2MML).text = to_id.get('b2mml:ToIDValue', '')
                ET.SubElement(el_to, '{%s}ToType' % NS_B2MML).text = to_id.get('b2mml:ToType', '')
                ET.SubElement(el_to, '{%s}IDScope' % NS_B2MML).text = to_id.get('b2mml:IDScope', '')
            ET.SubElement(el_link, '{%s}LinkType' % NS_B2MML).text = link.get('b2mml:LinkType', '')
            ET.SubElement(el_link, '{%s}Depiction' % NS_B2MML).text = link.get('b2mml:Depiction', '')
            ET.SubElement(el_link, '{%s}EvaluationOrder' % NS_B2MML).text = str(link.get('b2mml:EvaluationOrder', ''))
            ET.SubElement(el_link, '{%s}Description' % NS_B2MML).text = link.get('b2mml:Description', '')
        # Steps
        for step in procedure_logic.get('step', []):
            el_step = ET.SubElement(el_proc_logic, '{%s}Step' % NS_B2MML)
            ET.SubElement(el_step, '{%s}ID' % NS_B2MML).text = step.get('b2mml:ID', '')
            ET.SubElement(el_step, '{%s}RecipeElementID' % NS_B2MML).text = step.get('b2mml:RecipeElementID', '')
            ET.SubElement(el_step, '{%s}RecipeElementVersion' % NS_B2MML).text = step.get('b2mml:RecipeElementVersion', '')
            ET.SubElement(el_step, '{%s}Description' % NS_B2MML).text = step.get('b2mml:Description', '')
        # Transitions
        for transition in procedure_logic.get('transition', []):
            el_trans = ET.SubElement(el_proc_logic, '{%s}Transition' % NS_B2MML)
            ET.SubElement(el_trans, '{%s}ID' % NS_B2MML).text = transition.get('b2mml:ID', '')
            ET.SubElement(el_trans, '{%s}Condition' % NS_B2MML).text = transition.get('b2mml:Condition', '')

    # RecipeElement
    for elem in mr.get('recipeElement', []):
        el_elem = ET.SubElement(el_mr, '{%s}RecipeElement' % NS_B2MML)
        ET.SubElement(el_elem, '{%s}ID' % NS_B2MML).text = elem.get('b2mml:ID', '')
        ET.SubElement(el_elem, '{%s}Description' % NS_B2MML).text = elem.get('b2mml:Description', '')
        ET.SubElement(el_elem, '{%s}RecipeElementType' % NS_B2MML).text = elem.get('b2mml:RecipeElementType', '')
        ET.SubElement(el_elem, '{%s}ActualEquipmentID' % NS_B2MML).text = elem.get('b2mml:ActualEquipmentID', '')
        # EquipmentRequirement (optional, can be empty)
        eq_reqs = elem.get('b2mml:EquipmentRequirement', [])
        for eq in eq_reqs:
            el_eq = ET.SubElement(el_elem, '{%s}EquipmentRequirement' % NS_B2MML)
            ET.SubElement(el_eq, '{%s}ID' % NS_B2MML).text = eq.get('b2mml:ID', '')
        # Parameter (optional, can be empty)
        params = elem.get('b2mml:Parameter', [])
        for param in params:
            el_param = ET.SubElement(el_elem, '{%s}Parameter' % NS_B2MML)
            ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
            ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')

    # EquipmentElement (optional, top-level)
    for eq_elem in json_data.get('equipmentElement', []):
        el_eq_elem = ET.SubElement(root, '{%s}EquipmentElement' % NS_B2MML)
        ET.SubElement(el_eq_elem, '{%s}ID' % NS_B2MML).text = eq_elem.get('b2mml:ID', '')
        ET.SubElement(el_eq_elem, '{%s}EquipmentElementType' % NS_B2MML).text = eq_elem.get('b2mml:EquipmentElementType', '')
        ET.SubElement(el_eq_elem, '{%s}EquipmentElementLevel' % NS_B2MML).text = eq_elem.get('b2mml:EquipmentElementLevel', '')
        for proc_elem in eq_elem.get('b2mml:EquipmentProceduralElement', []):
            el_proc_elem = ET.SubElement(el_eq_elem, '{%s}EquipmentProceduralElement' % NS_B2MML)
            ET.SubElement(el_proc_elem, '{%s}ID' % NS_B2MML).text = proc_elem.get('b2mml:ID', '')
            ET.SubElement(el_proc_elem, '{%s}Description' % NS_B2MML).text = proc_elem.get('b2mml:Description', '')
            ET.SubElement(el_proc_elem, '{%s}EquipmentProceduralElementType' % NS_B2MML).text = proc_elem.get('b2mml:EquipmentProceduralElementType', '')
            for param in proc_elem.get('b2mml:Parameter', []):
                el_param = ET.SubElement(el_proc_elem, '{%s}Parameter' % NS_B2MML)
                ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
                ET.SubElement(el_param, '{%s}Description' % NS_B2MML).text = param.get('b2mml:Description', '')
                ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')
                ET.SubElement(el_param, '{%s}ParameterSubType' % NS_B2MML).text = param.get('b2mml:ParameterSubType', '')
                value = param.get('b2mml:Value', {})
                if value:
                    el_value = ET.SubElement(el_param, '{%s}Value' % NS_B2MML)
                    ET.SubElement(el_value, '{%s}ValueString' % NS_B2MML).text = value.get('b2mml:ValueString', '')
                    ET.SubElement(el_value, '{%s}DataInterpretation' % NS_B2MML).text = value.get('b2mml:DataInterpretation', '')
                    ET.SubElement(el_value, '{%s}DataType' % NS_B2MML).text = value.get('b2mml:DataType', '')
                    ET.SubElement(el_value, '{%s}UnitOfMeasure' % NS_B2MML).text = value.get('b2mml:UnitOfMeasure', '')

    # Generate XML string
    xml_string = ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')
    print("Generated XML:\n", xml_string)
    return xml_string

@recipe_api.route('/api/recipe/master', methods=['POST'])
def create_master_recipe():
    """
    Create a Master Recipe from JSON payload and return BatchML XML.
    ---
    tags:
      - Recipes
    parameters:
      - name: payload
        in: body
        type: object
        required: true
        description: Master recipe JSON payload with enhanced structure
    responses:
      200:
        description: Valid BatchML XML
      400:
        description: Schema validation failure
      500:
        description: Internal parse/XSD load error
    """
    try:
        # Get JSON payload from request
        json_data = request.get_json()
        if not json_data:
            return make_response("No JSON payload provided", 400)
        
        print("Received master recipe payload:", json.dumps(json_data, indent=2))
        
        # Convert JSON to XML with enhanced structure
        xml_string = convert_enhanced_json_to_batchml_xml(json_data)
        
        # Validate the XML
        ok, err = validate(
            xml_string,
            "batchml_schemas/schemas/BatchML-BatchInformation.xsd"
        )
        
        if ok:
            # Return the generated XML for download
            response = make_response(xml_string, 200)
            response.headers['Content-Type'] = 'application/xml'
            return response
        else:
            # Return validation error
            return make_response(f"Validation error: {err}", 400)
            
    except Exception as e:
        print(f"Error creating master recipe: {str(e)}")
        return make_response(f"Internal error: {str(e)}", 500)

def convert_enhanced_json_to_batchml_xml(json_data):
    """Convert the enhanced JSON payload to B2MML XML format with proper structure"""
    print("Converting enhanced JSON to BatchML XML:", json.dumps(json_data, indent=2))

    # Namespaces
    NS_B2MML = "http://www.mesa.org/xml/B2MML"
    NS_XSI = "http://www.w3.org/2001/XMLSchema-instance"
    NSMAP = {
        'b2mml': NS_B2MML,
        'xsi': NS_XSI
    }
    ET.register_namespace('b2mml', NS_B2MML)
    ET.register_namespace('xsi', NS_XSI)

    # Root element
    root = ET.Element('{%s}BatchInformation' % NS_B2MML, {
        '{%s}schemaLocation' % NS_XSI: 'http://www.mesa.org/xml/B2MML Schema/AllSchemas.xsd',
    })

    # ListHeader
    list_header = json_data.get('listHeader', {})
    el_list_header = ET.SubElement(root, '{%s}ListHeader' % NS_B2MML)
    ET.SubElement(el_list_header, '{%s}ID' % NS_B2MML).text = list_header.get('id', 'ListHeadID')
    ET.SubElement(el_list_header, '{%s}CreateDate' % NS_B2MML).text = list_header.get('createDate', '')

    # Description
    ET.SubElement(root, '{%s}Description' % NS_B2MML).text = json_data.get('description', '')

    # MasterRecipe
    mr = json_data.get('masterRecipe', {})
    el_mr = ET.SubElement(root, '{%s}MasterRecipe' % NS_B2MML)
    ET.SubElement(el_mr, '{%s}ID' % NS_B2MML).text = mr.get('id', 'MasterRecipe')
    ET.SubElement(el_mr, '{%s}Version' % NS_B2MML).text = mr.get('version', '1.0.0')
    ET.SubElement(el_mr, '{%s}VersionDate' % NS_B2MML).text = mr.get('versionDate', '')
    ET.SubElement(el_mr, '{%s}Description' % NS_B2MML).text = mr.get('description', '')

    # Header
    header = mr.get('header', {})
    el_header = ET.SubElement(el_mr, '{%s}Header' % NS_B2MML)
    ET.SubElement(el_header, '{%s}ProductID' % NS_B2MML).text = header.get('productId', '')
    ET.SubElement(el_header, '{%s}ProductName' % NS_B2MML).text = header.get('productName', '')

    # EquipmentRequirement
    equipment_requirements = mr.get('equipmentRequirement', [])
    for req in equipment_requirements:
        el_req = ET.SubElement(el_mr, '{%s}EquipmentRequirement' % NS_B2MML)
        ET.SubElement(el_req, '{%s}ID' % NS_B2MML).text = req.get('b2mml:ID', '')
        
        constraint = req.get('b2mml:Constraint', {})
        if constraint:
            el_constraint = ET.SubElement(el_req, '{%s}Constraint' % NS_B2MML)
            ET.SubElement(el_constraint, '{%s}ID' % NS_B2MML).text = constraint.get('b2mml:ID', '')
            ET.SubElement(el_constraint, '{%s}Condition' % NS_B2MML).text = constraint.get('b2mml:Condition', '')
        
        ET.SubElement(el_req, '{%s}Description' % NS_B2MML).text = req.get('b2mml:Description', '')

    # Formula
    formula = mr.get('formula', {})
    if formula:
        el_formula = ET.SubElement(el_mr, '{%s}Formula' % NS_B2MML)
        
        # Parameters
        parameters = formula.get('parameter', [])
        for param in parameters:
            el_param = ET.SubElement(el_formula, '{%s}Parameter' % NS_B2MML)
            ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
            ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')
            ET.SubElement(el_param, '{%s}ParameterSubType' % NS_B2MML).text = param.get('b2mml:ParameterSubType', '')
            
            value = param.get('b2mml:Value', {})
            if value:
                el_value = ET.SubElement(el_param, '{%s}Value' % NS_B2MML)
                ET.SubElement(el_value, '{%s}ValueString' % NS_B2MML).text = value.get('b2mml:ValueString', '')
                ET.SubElement(el_value, '{%s}DataInterpretation' % NS_B2MML).text = value.get('b2mml:DataInterpretation', '')
                ET.SubElement(el_value, '{%s}DataType' % NS_B2MML).text = value.get('b2mml:DataType', '')
                ET.SubElement(el_value, '{%s}UnitOfMeasure' % NS_B2MML).text = value.get('b2mml:UnitOfMeasure', '')
        
        # Materials
        materials = formula.get('material', [])
        for material in materials:
            el_material = ET.SubElement(el_formula, '{%s}Material' % NS_B2MML)
            ET.SubElement(el_material, '{%s}ID' % NS_B2MML).text = material.get('b2mml:ID', '')
            ET.SubElement(el_material, '{%s}Description' % NS_B2MML).text = material.get('b2mml:Description', '')
            ET.SubElement(el_material, '{%s}MaterialType' % NS_B2MML).text = material.get('b2mml:MaterialType', '')
            
            amount = material.get('b2mml:Amount', {})
            if amount:
                el_amount = ET.SubElement(el_material, '{%s}Amount' % NS_B2MML)
                ET.SubElement(el_amount, '{%s}ValueString' % NS_B2MML).text = amount.get('b2mml:ValueString', '')
                ET.SubElement(el_amount, '{%s}UnitOfMeasure' % NS_B2MML).text = amount.get('b2mml:UnitOfMeasure', '')

    # ProcedureLogic
    procedure_logic = mr.get('procedureLogic', {})
    if procedure_logic:
        el_procedure_logic = ET.SubElement(el_mr, '{%s}ProcedureLogic' % NS_B2MML)
        
        # Steps
        steps = procedure_logic.get('step', [])
        for step in steps:
            el_step = ET.SubElement(el_procedure_logic, '{%s}Step' % NS_B2MML)
            ET.SubElement(el_step, '{%s}ID' % NS_B2MML).text = step.get('b2mml:ID', '')
            ET.SubElement(el_step, '{%s}RecipeElementID' % NS_B2MML).text = step.get('b2mml:RecipeElementID', '')
            ET.SubElement(el_step, '{%s}RecipeElementVersion' % NS_B2MML).text = step.get('b2mml:RecipeElementVersion', '')
            ET.SubElement(el_step, '{%s}Description' % NS_B2MML).text = step.get('b2mml:Description', '')
        
        # Transitions
        transitions = procedure_logic.get('transition', [])
        for transition in transitions:
            el_transition = ET.SubElement(el_procedure_logic, '{%s}Transition' % NS_B2MML)
            ET.SubElement(el_transition, '{%s}ID' % NS_B2MML).text = transition.get('b2mml:ID', '')
            ET.SubElement(el_transition, '{%s}Condition' % NS_B2MML).text = transition.get('b2mml:Condition', '')

    # RecipeElement
    recipe_elements = mr.get('recipeElement', [])
    for element in recipe_elements:
        el_recipe_element = ET.SubElement(el_mr, '{%s}RecipeElement' % NS_B2MML)
        ET.SubElement(el_recipe_element, '{%s}ID' % NS_B2MML).text = element.get('b2mml:ID', '')
        ET.SubElement(el_recipe_element, '{%s}Description' % NS_B2MML).text = element.get('b2mml:Description', '')
        ET.SubElement(el_recipe_element, '{%s}RecipeElementType' % NS_B2MML).text = element.get('b2mml:RecipeElementType', '')
        ET.SubElement(el_recipe_element, '{%s}ActualEquipmentID' % NS_B2MML).text = element.get('b2mml:ActualEquipmentID', '')
        
        # EquipmentRequirement
        equipment_reqs = element.get('b2mml:EquipmentRequirement', [])
        for req in equipment_reqs:
            el_eq_req = ET.SubElement(el_recipe_element, '{%s}EquipmentRequirement' % NS_B2MML)
            ET.SubElement(el_eq_req, '{%s}ID' % NS_B2MML).text = req.get('b2mml:ID', '')
        
        # Parameters
        parameters = element.get('b2mml:Parameter', [])
        for param in parameters:
            el_param = ET.SubElement(el_recipe_element, '{%s}Parameter' % NS_B2MML)
            ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
            ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')

    # EquipmentElement
    equipment_elements = json_data.get('equipmentElement', [])
    for equipment in equipment_elements:
        el_equipment = ET.SubElement(root, '{%s}EquipmentElement' % NS_B2MML)
        ET.SubElement(el_equipment, '{%s}ID' % NS_B2MML).text = equipment.get('b2mml:ID', '')
        ET.SubElement(el_equipment, '{%s}EquipmentElementType' % NS_B2MML).text = equipment.get('b2mml:EquipmentElementType', '')
        ET.SubElement(el_equipment, '{%s}EquipmentElementLevel' % NS_B2MML).text = equipment.get('b2mml:EquipmentElementLevel', '')
        
        # EquipmentProceduralElement
        procedural_elements = equipment.get('b2mml:EquipmentProceduralElement', [])
        for proc_elem in procedural_elements:
            el_proc_elem = ET.SubElement(el_equipment, '{%s}EquipmentProceduralElement' % NS_B2MML)
            ET.SubElement(el_proc_elem, '{%s}ID' % NS_B2MML).text = proc_elem.get('b2mml:ID', '')
            ET.SubElement(el_proc_elem, '{%s}Description' % NS_B2MML).text = proc_elem.get('b2mml:Description', '')
            ET.SubElement(el_proc_elem, '{%s}EquipmentProceduralElementType' % NS_B2MML).text = proc_elem.get('b2mml:EquipmentProceduralElementType', '')
            
            # Parameters
            proc_params = proc_elem.get('b2mml:Parameter', [])
            for param in proc_params:
                el_param = ET.SubElement(el_proc_elem, '{%s}Parameter' % NS_B2MML)
                ET.SubElement(el_param, '{%s}ID' % NS_B2MML).text = param.get('b2mml:ID', '')
                ET.SubElement(el_param, '{%s}Description' % NS_B2MML).text = param.get('b2mml:Description', '')
                ET.SubElement(el_param, '{%s}ParameterType' % NS_B2MML).text = param.get('b2mml:ParameterType', '')
                ET.SubElement(el_param, '{%s}ParameterSubType' % NS_B2MML).text = param.get('b2mml:ParameterSubType', '')
                
                value = param.get('b2mml:Value', {})
                if value:
                    el_value = ET.SubElement(el_param, '{%s}Value' % NS_B2MML)
                    ET.SubElement(el_value, '{%s}ValueString' % NS_B2MML).text = value.get('b2mml:ValueString', '')
                    ET.SubElement(el_value, '{%s}DataInterpretation' % NS_B2MML).text = value.get('b2mml:DataInterpretation', '')
                    ET.SubElement(el_value, '{%s}DataType' % NS_B2MML).text = value.get('b2mml:DataType', '')
                    ET.SubElement(el_value, '{%s}UnitOfMeasure' % NS_B2MML).text = value.get('b2mml:UnitOfMeasure', '')
        
        # EquipmentConnection
        connections = equipment.get('b2mml:EquipmentConnection', [])
        for conn in connections:
            el_conn = ET.SubElement(el_equipment, '{%s}EquipmentConnection' % NS_B2MML)
            ET.SubElement(el_conn, '{%s}ID' % NS_B2MML).text = conn.get('b2mml:ID', '')
            ET.SubElement(el_conn, '{%s}ConnectionType' % NS_B2MML).text = conn.get('b2mml:ConnectionType', '')
            ET.SubElement(el_conn, '{%s}FromEquipmentID' % NS_B2MML).text = conn.get('b2mml:FromEquipmentID', '')
            ET.SubElement(el_conn, '{%s}ToEquipmentID' % NS_B2MML).text = conn.get('b2mml:ToEquipmentID', '')

    # Convert to string
    xml_string = ET.tostring(root, encoding='unicode', method='xml')
    print("Generated XML:", xml_string)
    return xml_string