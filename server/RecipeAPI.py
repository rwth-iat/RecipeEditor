from flask import Blueprint, request, make_response, flash, jsonify
import xml.etree.ElementTree as ET
from lxml import etree
from django.utils.encoding import iri_to_uri, uri_to_iri
import json
from pathlib import Path
from xml.sax.saxutils import escape
try:
    from dicttoxml import dicttoxml
except ImportError:
    # Fallback if dicttoxml is not installed
    def dicttoxml(data, custom_root="", attr_type=False):
        return "<xml>dicttoxml not available</xml>"
from typing import Tuple

recipe_api = Blueprint('recipe_api', __name__)


def build_error_xml(message: str) -> str:
    safe_message = escape(message or "")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Error><Message>{safe_message}</Message></Error>"
    )

def validate(xml_string: str, xsd_relpath: str) -> Tuple[bool, str]:
    # 1) Locate the XSD file next to this .py
    here = Path(__file__).resolve().parent
    xsd_path = (here / xsd_relpath).resolve()

    # 2) Load/compile the schema
    try:
        # Parse via a normalized file URI so nested includes/imports resolve
        schema_doc = etree.parse(xsd_path.as_uri())
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
      "200":
        description: Given String is valid.
        "400":
        description: Given String is not valid.
    """
    args = request.args
    xml_string = args.get("xml_string", type=str)
    if not xml_string:
        xml_string = ""
    print(xml_string)

    valid, error = validate(xml_string, "batchml_schemas/schemas/BatchML-GeneralRecipe.xsd")   
    if valid:
        print('Recipe is valid!')
        response = make_response("valid!", 200)
        return response
    elif error.startswith("XSD load") or error.startswith("XML parse"):
        response = make_response(error, 500)
        return response
    else:
        print('Recipe is not valid!')
        response = make_response(error, 400)
        return response
@recipe_api.route('/material/validate')
def validate_material_information():
    """Endpoint to validate a xml string against B2MML Material schema.
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
      "200":
        description: Given String is valid.
      "400":
        description: Given String is not valid.
    """
    args = request.args
    xml_string = args.get("xml_string", type=str)
    if not xml_string:
        xml_string = ""

    valid, error = validate(xml_string, "batchml_schemas/schemas/B2MML-Material.xsd")
    if valid:
        response = make_response("valid!", 200)
        return response
    elif error.startswith("XSD load") or error.startswith("XML parse"):
        response = make_response(error, 500)
        return response
    else:
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
      "200":
        description: Valid XML
      "400":
        description: Schema validation failure
      "500":
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
      "200":
        description: Valid XML
      "400":
        description: Schema validation failure
      "500":
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
      "200":
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
      "200":
        description: Valid BatchML XML
      "400":
        description: Schema validation failure
      "500":
        description: Internal parse/XSD load error
    """
    try:
        # Get JSON payload from request
        json_data = request.get_json()
        if not json_data:
            response = make_response(build_error_xml("No JSON payload provided"), 400)
            response.headers['Content-Type'] = 'application/xml'
            response.headers['X-Validation-Error'] = "No JSON payload provided"
            return response
        
        print("Received master recipe payload:", json.dumps(json_data, indent=2))
        
        # Convert JSON to XML with enhanced structure
        xml_string = convert_enhanced_json_to_batchml_xml(json_data)
        
        # Validate the XML
        ok, err = validate(
            xml_string,
            "batchml_schemas/schemas/BatchML-BatchInformation.xsd"
        )
        
        status_code = 200 if ok else 400
        response = make_response(xml_string, status_code)
        response.headers['Content-Type'] = 'application/xml'
        if not ok:
            # Include schema details separately so clients can show a clear error message.
            response.headers['X-Validation-Error'] = " ".join(str(err).split())[:2000]
        return response
            
    except Exception as e:
        print(f"Error creating master recipe: {str(e)}")
        response = make_response(build_error_xml(f"Internal error: {str(e)}"), 500)
        response.headers['Content-Type'] = 'application/xml'
        response.headers['X-Validation-Error'] = "Internal error while creating master recipe"
        return response

def convert_enhanced_json_to_batchml_xml(json_data):
    """Convert the enhanced JSON payload to B2MML XML format with proper structure."""
    print("Converting enhanced JSON to BatchML XML:", json.dumps(json_data, indent=2))

    ns_b2mml = "http://www.mesa.org/xml/B2MML"
    ns_xsi = "http://www.w3.org/2001/XMLSchema-instance"
    ET.register_namespace('b2mml', ns_b2mml)
    ET.register_namespace('xsi', ns_xsi)

    def qname(name: str) -> str:
        return f'{{{ns_b2mml}}}{name}'

    allowed_data_types = {
        "Amount", "BinaryObject", "Code", "DateTime", "Identifier", "Indicator",
        "Measure", "Numeric", "Quantity", "Text", "string", "byte", "unsignedByte",
        "binary", "integer", "positiveInteger", "negativeInteger", "nonNegativeInteger",
        "nonPositiveInteger", "int", "unsignedInt", "long", "unsignedLong", "short",
        "unsignedShort", "decimal", "float", "double", "boolean", "time",
        "timeInstant", "timePeriod", "duration", "date", "dateTime", "month",
        "year", "century", "recurringDay", "recurringDate", "recurringDuration",
        "Name", "QName", "NCName", "uriReference", "language", "ID", "IDREF",
        "IDREFS", "ENTITY", "ENTITIES", "NOTATION", "NMTOKEN", "NMTOKENS",
        "Enumeration", "SVG", "Other",
    }
    data_type_aliases = {
        "temperature": "Measure",
        "pressure": "Measure",
        "flow": "Measure",
        "level": "Measure",
        "speed": "Measure",
        "weight": "Measure",
        "density": "Measure",
        "time": "duration",
    }

    def append_text(parent, name, value, required=False):
        text = ""
        if value is not None:
            text = str(value)
        if not required and text == "":
            return None
        element = ET.SubElement(parent, qname(name))
        element.text = text
        return element

    def append_descriptions(parent, description):
        if description is None:
            return
        if isinstance(description, list):
            for entry in description:
                append_descriptions(parent, entry)
            return
        append_text(parent, "Description", description)

    def append_value(parent, value):
        if not value:
            return

        raw_data_type = value.get('b2mml:DataType')
        normalized_data_type = data_type_aliases.get(
            str(raw_data_type).strip().lower(),
            raw_data_type,
        )
        if normalized_data_type not in allowed_data_types:
            normalized_data_type = "string" if normalized_data_type else ""

        el_value = ET.SubElement(parent, qname("Value"))
        append_text(el_value, "ValueString", value.get('b2mml:ValueString'), required=True)
        append_text(el_value, "DataInterpretation", value.get('b2mml:DataInterpretation'))
        append_text(el_value, "DataType", normalized_data_type)
        append_text(el_value, "UnitOfMeasure", value.get('b2mml:UnitOfMeasure'))

    def append_parameter(parent, parameter):
        el_parameter = ET.SubElement(parent, qname("Parameter"))
        append_text(el_parameter, "ID", parameter.get('b2mml:ID', ''), required=True)
        append_descriptions(el_parameter, parameter.get('b2mml:Description'))
        append_text(el_parameter, "ParameterType", parameter.get('b2mml:ParameterType'))
        append_text(el_parameter, "ParameterSubType", parameter.get('b2mml:ParameterSubType'))
        append_value(el_parameter, parameter.get('b2mml:Value'))

    def append_equipment_requirement(parent, requirement, include_constraint=False):
        el_requirement = ET.SubElement(parent, qname("EquipmentRequirement"))
        append_text(el_requirement, "ID", requirement.get('b2mml:ID', ''), required=True)
        if include_constraint and requirement.get('b2mml:Constraint'):
            constraint = requirement.get('b2mml:Constraint', {})
            el_constraint = ET.SubElement(el_requirement, qname("Constraint"))
            append_text(el_constraint, "ID", constraint.get('b2mml:ID', ''))
            append_text(el_constraint, "Condition", constraint.get('b2mml:Condition'))
        append_descriptions(el_requirement, requirement.get('b2mml:Description'))

    def append_formula_material(parent, material):
        el_material = ET.SubElement(parent, qname("Material"))
        append_text(el_material, "ID", material.get('b2mml:ID', ''), required=True)
        append_descriptions(el_material, material.get('b2mml:Description'))
        append_text(el_material, "MaterialType", material.get('b2mml:MaterialType'))

        amount = material.get('b2mml:Amount')
        if amount:
            el_amount = ET.SubElement(el_material, qname("Amount"))
            append_text(el_amount, "ValueString", amount.get('b2mml:ValueString'), required=True)
            append_text(el_amount, "UnitOfMeasure", amount.get('b2mml:UnitOfMeasure'))

    def append_link_endpoint(parent, name, endpoint):
        el_endpoint = ET.SubElement(parent, qname(name))
        append_text(el_endpoint, f"{name}Value", endpoint.get(f"b2mml:{name}Value", ''), required=True)
        append_text(el_endpoint, f"{name[:-2]}Type", endpoint.get(f"b2mml:{name[:-2]}Type"), required=True)
        append_text(el_endpoint, "IDScope", endpoint.get("b2mml:IDScope"))

    def append_link(parent, link):
        el_link = ET.SubElement(parent, qname("Link"))
        append_text(el_link, "ID", link.get('b2mml:ID', ''), required=True)
        append_link_endpoint(el_link, "FromID", link.get('b2mml:FromID', {}))
        append_link_endpoint(el_link, "ToID", link.get('b2mml:ToID', {}))
        append_text(el_link, "LinkType", link.get('b2mml:LinkType'), required=True)
        append_text(el_link, "Depiction", link.get('b2mml:Depiction'))
        append_text(el_link, "EvaluationOrder", link.get('b2mml:EvaluationOrder'))
        append_descriptions(el_link, link.get('b2mml:Description'))

    def append_step(parent, step):
        el_step = ET.SubElement(parent, qname("Step"))
        append_text(el_step, "ID", step.get('b2mml:ID', ''), required=True)
        append_text(el_step, "RecipeElementID", step.get('b2mml:RecipeElementID', ''), required=True)
        append_text(el_step, "RecipeElementVersion", step.get('b2mml:RecipeElementVersion', ''), required=True)
        append_descriptions(el_step, step.get('b2mml:Description'))

    def append_transition(parent, transition):
        el_transition = ET.SubElement(parent, qname("Transition"))
        append_text(el_transition, "ID", transition.get('b2mml:ID', ''), required=True)
        append_text(el_transition, "Condition", transition.get('b2mml:Condition', ''), required=True)
        append_descriptions(el_transition, transition.get('b2mml:Description'))

    def append_recipe_element(parent, element):
        el_recipe_element = ET.SubElement(parent, qname("RecipeElement"))
        append_text(el_recipe_element, "ID", element.get('b2mml:ID', ''), required=True)
        append_descriptions(el_recipe_element, element.get('b2mml:Description'))
        append_text(el_recipe_element, "RecipeElementType", element.get('b2mml:RecipeElementType', ''), required=True)
        append_text(el_recipe_element, "ActualEquipmentID", element.get('b2mml:ActualEquipmentID'))

        for requirement in element.get('b2mml:EquipmentRequirement', []):
            append_equipment_requirement(el_recipe_element, requirement)
        for parameter in element.get('b2mml:Parameter', []):
            append_parameter(el_recipe_element, parameter)

    def append_equipment_element(parent, equipment):
        el_equipment = ET.SubElement(parent, qname("EquipmentElement"))
        append_text(el_equipment, "ID", equipment.get('b2mml:ID', ''), required=True)
        append_descriptions(el_equipment, equipment.get('b2mml:Description'))
        append_text(el_equipment, "EquipmentElementType", equipment.get('b2mml:EquipmentElementType', ''), required=True)
        append_text(el_equipment, "EquipmentElementLevel", equipment.get('b2mml:EquipmentElementLevel', ''), required=True)

        for procedural_element in equipment.get('b2mml:EquipmentProceduralElement', []):
            el_procedural_element = ET.SubElement(el_equipment, qname("EquipmentProceduralElement"))
            append_text(el_procedural_element, "ID", procedural_element.get('b2mml:ID', ''), required=True)
            append_descriptions(el_procedural_element, procedural_element.get('b2mml:Description'))
            append_text(
                el_procedural_element,
                "EquipmentProceduralElementType",
                procedural_element.get('b2mml:EquipmentProceduralElementType', ''),
                required=True,
            )
            for parameter in procedural_element.get('b2mml:Parameter', []):
                append_parameter(el_procedural_element, parameter)

        for connection in equipment.get('b2mml:EquipmentConnection', []):
            el_connection = ET.SubElement(el_equipment, qname("EquipmentConnection"))
            append_text(el_connection, "ID", connection.get('b2mml:ID', ''), required=True)
            append_descriptions(el_connection, connection.get('b2mml:Description'))
            append_text(el_connection, "ConnectionType", connection.get('b2mml:ConnectionType'))
            append_text(el_connection, "FromEquipmentID", connection.get('b2mml:FromEquipmentID'))
            append_text(el_connection, "ToEquipmentID", connection.get('b2mml:ToEquipmentID'))

    root = ET.Element(qname("BatchInformation"), {
        f'{{{ns_xsi}}}schemaLocation': 'http://www.mesa.org/xml/B2MML Schema/AllSchemas.xsd',
    })

    list_header = json_data.get('listHeader', {})
    el_list_header = ET.SubElement(root, qname("ListHeader"))
    append_text(el_list_header, "ID", list_header.get('id', 'ListHeadID'), required=True)
    append_text(el_list_header, "CreateDate", list_header.get('createDate', ''), required=True)
    append_descriptions(root, json_data.get('description'))

    master_recipe = json_data.get('masterRecipe', {})
    el_master_recipe = ET.SubElement(root, qname("MasterRecipe"))
    append_text(el_master_recipe, "ID", master_recipe.get('id', 'MasterRecipe'), required=True)
    append_text(el_master_recipe, "Version", master_recipe.get('version', '1.0.0'), required=True)
    append_text(el_master_recipe, "VersionDate", master_recipe.get('versionDate', ''), required=True)
    append_descriptions(el_master_recipe, master_recipe.get('description'))

    header = master_recipe.get('header', {})
    el_header = ET.SubElement(el_master_recipe, qname("Header"))
    append_text(el_header, "ProductID", header.get('productId', ''), required=True)
    append_text(el_header, "ProductName", header.get('productName', ''), required=True)

    for requirement in master_recipe.get('equipmentRequirement', []):
        append_equipment_requirement(el_master_recipe, requirement, include_constraint=True)

    formula = master_recipe.get('formula', {})
    if formula:
        el_formula = ET.SubElement(el_master_recipe, qname("Formula"))
        for parameter in formula.get('parameter', []):
            append_parameter(el_formula, parameter)
        for material in formula.get('material', []):
            append_formula_material(el_formula, material)

    procedure_logic = master_recipe.get('procedureLogic', {})
    if procedure_logic:
        el_procedure_logic = ET.SubElement(el_master_recipe, qname("ProcedureLogic"))
        for link in procedure_logic.get('link', []):
            append_link(el_procedure_logic, link)
        for step in procedure_logic.get('step', []):
            append_step(el_procedure_logic, step)
        for transition in procedure_logic.get('transition', []):
            append_transition(el_procedure_logic, transition)

    for recipe_element in master_recipe.get('recipeElement', []):
        append_recipe_element(el_master_recipe, recipe_element)

    for equipment_element in json_data.get('equipmentElement', []):
        append_equipment_element(root, equipment_element)

    if hasattr(ET, "indent"):
        ET.indent(root, space="  ")

    xml_string = ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')
    print("Generated XML:", xml_string)
    return xml_string
