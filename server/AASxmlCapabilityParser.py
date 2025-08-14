import io
import xml.etree.ElementTree as ET
import json
from pathlib import Path

# Pfade zu den hochgeladenen Dateien
files = [
    "../AAS/HC10.xml",
    "../AAS/HC20.xml",
    "../AAS/HC30.xml"
]

def parse_capabilities_robust_from_bytes(file_content_bytes):
    
    tree = ET.parse(io.BytesIO(file_content_bytes))
    root = tree.getroot()

    ns = {'aas': 'https://admin-shell.io/aas/3/0'}

    capabilities = []

    for capability_SM in root.findall(".//aas:submodel", ns):
        capability_SM_value = capability_SM.find(".//aas:value", ns)
        if capability_SM_value is not None and "https://admin-shell.io/idta/CapabilityDescription/1/0/Submodel" in capability_SM_value.text:
            for capability_sets in capability_SM.findall("aas:submodelElements/aas:submodelElementCollection", ns):
                for capability_container in capability_sets.findall("aas:value/aas:submodelElementCollection", ns):
                    for capability_element in capability_container.findall("aas:value/aas:capability", ns):
                        if capability_element is not None:
                            capability_element_name = capability_element.find("aas:idShort", ns)
                            capability_element_reference = capability_element.find("aas:supplementalSemanticIds//aas:value", ns)
                            capability_comment = capability_container.find("aas:value/aas:multiLanguageProperty/aas:value//aas:text", ns)
                            capability = {
                                'capability': [],
                                'properties': [],
                                'generalized_by': [],
                                'realized_by': []
                            }

                            capability['capability'].append({
                                'capability_name': capability_element_name.text,
                                'capability_comment': capability_comment.text if capability_comment is not None else "",
                                'capability_ID': capability_element_reference.text
                            })

                            # Properties
                            for property_sets in capability_container.findall(".//aas:submodelElementCollection", ns):
                                property_sets_value = property_sets.find(".//aas:value", ns)
                                if property_sets_value is not None and "https://admin-shell.io/idta/CapabilityDescription/PropertySet/1/0" in property_sets_value.text:
                                    for property_container in property_sets.findall(".//aas:submodelElementCollection", ns):

                                        # Iterating over properties with range:
                                        property_type_range = property_container.find("aas:value/aas:range", ns)
                                        if property_type_range is not None:

                                            prop_name = property_type_range.find("aas:idShort", ns)
                                            prop_id = property_type_range.find("aas:supplementalSemanticIds//aas:value", ns)
                                            unit = property_type_range.find("aas:embeddedDataSpecifications//aas:value", ns)
                                            vtype = property_type_range.find("aas:valueType", ns)
                                            min_val = property_type_range.find("aas:min", ns)
                                            max_val = property_type_range.find("aas:max", ns)
                                            prop_comment = property_container.find("aas:value/aas:multiLanguageProperty/aas:value//aas:text", ns)
                                            prop_relBy = property_container.find("aas:value/aas:relationshipElement/aas:second//aas:value", ns)


                                            prop_entry = {
                                                'property_name': prop_name.text if prop_name is not None else "",
                                                'property_comment': prop_comment.text if prop_comment is not None else "",
                                                'property_ID': prop_id.text if prop_id is not None else "",
                                                'property_unit': unit.text if unit is not None else "",
                                                'valueType': vtype.text if vtype is not None else "",
                                                'valueMin': min_val.text if min_val is not None else "",
                                                'valueMax': max_val.text if max_val is not None else "",
                                                'propertyRealizedBy': prop_relBy.text if prop_relBy is not None else "",
                                                'property_constraint': []
                                            }

                                            # Search for optional constraints of each property from type range:
                                            for capability_relations in capability_container.findall(".//aas:submodelElementCollection", ns):
                                                capability_relations_semantic_id = capability_relations.find("aas:semanticId//aas:value", ns)
                                                if capability_relations_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/CapabilityRelations/1/0" in capability_relations_semantic_id.text:

                                                    for constraint_sets in capability_relations.findall("aas:value/aas:submodelElementCollection", ns):
                                                        constraint_set_semantic_id = constraint_sets.find("aas:semanticId//aas:value", ns)
                                                        if constraint_set_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/ConstraintSet/1/0" in constraint_set_semantic_id.text:

                                                            for constraint_set in constraint_sets.findall("aas:value/aas:submodelElementCollection", ns):
                                                                constraint_set_semantic_id = constraint_set.find("aas:semanticId//aas:value", ns)
                                                                if constraint_set_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/PropertyConstraintContainer/1/0" in constraint_set_semantic_id.text:

                                                                    for relationship_constraint in constraint_set.findall("aas:value/aas:submodelElementCollection/aas:value/aas:relationshipElement", ns):
                                                                        second_keys = relationship_constraint.find("aas:second/aas:keys", ns)
                                                                        if second_keys is not None:
                                                                            key_elements = second_keys.findall("aas:key", ns)
                                                                            if key_elements:
                                                                                last_key = key_elements[-1]
                                                                                last_value = last_key.find("aas:value", ns)
                                                                                if last_value is not None and last_value.text == prop_name.text:

                                                                                    # Initialisiere Sammel-Variablen für dieses Property
                                                                                    constraint_type = None
                                                                                    conditional_type = None
                                                                                    property_constraint_ID = None
                                                                                    property_constraint_unit = None
                                                                                    property_constraint_value = None

                                                                                    # Jetzt alle Properties dieses ConstraintContainers durchlaufen
                                                                                    for property_elements in constraint_set.findall("aas:value/aas:property", ns):
                                                                                        property_element_semantic_id = property_elements.find("aas:semanticId//aas:value", ns)

                                                                                        if property_element_semantic_id is not None:
                                                                                            sid_text = property_element_semantic_id.text

                                                                                            if "https://admin-shell.io/idta/CapabilityDescription/ConstraintType/1/0" in sid_text:
                                                                                                constraint_type_value = property_elements.find("aas:value", ns)
                                                                                                constraint_type = constraint_type_value.text if constraint_type_value is not None else ""

                                                                                            elif "https://admin-shell.io/idta/CapabilityDescription/PropertyConditionalType/1/0" in sid_text:
                                                                                                conditional_type_value = property_elements.find("aas:value", ns)
                                                                                                conditional_type = conditional_type_value.text if conditional_type_value is not None else ""


                                                                                            elif "https://admin-shell.io/idta/CapabilityDescription/PropertyConstraintType/BasicConstraint/1/0" in sid_text:
                                                                                                constraint_ID_value = property_elements.find("aas:supplementalSemanticIds//aas:value", ns)
                                                                                                unit_value = property_elements.find("aas:embeddedDataSpecifications//aas:value", ns)
                                                                                                qualifier_value = property_elements.find("aas:qualifiers//aas:value", ns)
                                                                                                constraint_value = property_elements.find("aas:value", ns)

                                                                                                property_constraint_ID = constraint_ID_value.text if constraint_ID_value is not None else ""
                                                                                                property_constraint_unit = unit_value.text if unit_value is not None else ""

                                                                                                if qualifier_value is not None and qualifier_value.text == "GREATER_THAN_0":
                                                                                                    property_constraint_value = ">" + (constraint_value.text if constraint_value is not None else "")
                                                                                                elif qualifier_value is not None and qualifier_value.text == "GREATER_EQUAL_1":
                                                                                                    property_constraint_value = ">=" + (constraint_value.text if constraint_value is not None else "")
                                                                                                elif qualifier_value is not None and qualifier_value.text == "EQUAL_2":
                                                                                                    property_constraint_value = "==" + (constraint_value.text if constraint_value is not None else "")
                                                                                                elif qualifier_value is not None and qualifier_value.text == "NOT_EQUAL_3":
                                                                                                    property_constraint_value = "!=" + (constraint_value.text if constraint_value is not None else "")
                                                                                                elif qualifier_value is not None and qualifier_value.text == "LESS_EQUAL_4":
                                                                                                    property_constraint_value = "<=" + (constraint_value.text if constraint_value is not None else "")
                                                                                                elif qualifier_value is not None and qualifier_value.text == "LESS_THAN_5":
                                                                                                    property_constraint_value = "<" + (constraint_value.text if constraint_value is not None else "")
                                                                                                else:
                                                                                                    property_constraint_value = constraint_value.text if constraint_value is not None else ""

                                                                                    # After all information parsed, constraint object is created
                                                                                    constraint = {
                                                                                        'conditional_type': conditional_type if conditional_type else "",
                                                                                        'constraint_type': constraint_type if constraint_type else "",
                                                                                        'property_constraint_ID': property_constraint_ID if property_constraint_ID else "",
                                                                                        'property_constraint_unit': property_constraint_unit if property_constraint_unit else "",
                                                                                        'property_constraint_value': property_constraint_value if property_constraint_value else ""
                                                                                    }

                                                                                    # Only append when constraint is present
                                                                                    if any(v != "" for v in constraint.values()):
                                                                                        prop_entry['property_constraint'].append(constraint)


                                            capability['properties'].append(prop_entry)

                                        # Iterating over properties with submodelElementList:
                                        # TODO: Add Constraints for each element from submodelElementList
                                        property_type_submodelElementList = property_container.find("aas:value/aas:submodelElementList", ns)
                                        if property_type_submodelElementList is not None:

                                            prop_name = property_type_submodelElementList.find("aas:idShort", ns)
                                            prop_id = property_type_submodelElementList.find("aas:supplementalSemanticIds//aas:value", ns)
                                            unit = property_type_submodelElementList.find("aas:embeddedDataSpecifications//aas:value", ns)
                                            vtype = property_type_submodelElementList.find("aas:valueTypeListElement", ns)
                                            prop_comment = property_container.find("aas:value/aas:multiLanguageProperty/aas:value//aas:text", ns)
                                            prop_relBy = property_container.find("aas:value/aas:relationshipElement/aas:second//aas:value", ns)

                                            result = {
                                                'property_name': prop_name.text if prop_name is not None else "",
                                                'property_comment': prop_comment.text if prop_comment is not None else "",
                                                'property_ID': prop_id.text if prop_id is not None else "",
                                                'property_unit': unit.text if unit is not None else "",
                                                'valueType': vtype.text if vtype is not None else ""
                                            }

                                            value_list = property_type_submodelElementList.findall("aas:value/aas:property", ns)
                                            for i, val_elem in enumerate(value_list):
                                                val = val_elem.find("aas:value", ns)
                                                result[f"value{i}"] = val.text if val is not None else ""

                                            result['property_realized_by'] = prop_relBy.text if prop_relBy is not None else ""


                                            capability['properties'].append(result)

                            # CapabilityRelations
                            for capability_relations in capability_container.findall(".//aas:submodelElementCollection", ns):
                                # Prüfen, ob es sich um den CapabilityRelations-Block handelt
                                capability_relations_semantic_id = capability_relations.find("aas:semanticId//aas:value", ns)
                                if capability_relations_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/CapabilityRelations/1/0" in capability_relations_semantic_id.text:

                                    for generalized_by_sets in capability_relations.findall("aas:value/aas:submodelElementCollection", ns):
                                        generalized_by_semantic_id = generalized_by_sets.find("aas:semanticId//aas:value", ns)
                                        if generalized_by_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/GeneralizedBySet/1/0" in generalized_by_semantic_id.text:

                                            for relationship_generalized_by in generalized_by_sets.findall("aas:value/aas:relationshipElement", ns):
                                                second_keys = relationship_generalized_by.find("aas:second/aas:keys", ns)
                                                if second_keys is not None:
                                                    key_elements = second_keys.findall("aas:key", ns)
                                                    if key_elements:
                                                        last_key = key_elements[-1]
                                                        last_value = last_key.find("aas:value", ns)
                                                        if last_value is not None:
                                                            capability['generalized_by'].append(last_value.text)

                                    for realized_by in capability_relations.findall("aas:value/aas:relationshipElement", ns):
                                        realized_by_semantic_id = realized_by.find("aas:semanticId//aas:value", ns)
                                        if realized_by_semantic_id is not None and "https://admin-shell.io/idta/CapabilityDescription/CapabilityRealizedBy/1/0" in realized_by_semantic_id.text:
                                            realized_by_value = realized_by.find("aas:second//aas:value", ns)
                                            if realized_by_value is not None:
                                                capability['realized_by'].append(realized_by_value.text)



                            capabilities.append(capability)

    return capabilities

def constraint_to_dict(c):
    return {
        "conditional_type": c.conditional_type,
        "constraint_type": c.constraint_type,
        "constraint_ID": c.constraint_ID,
        "unit": c.unit,
        "value": c.value
    }

def property_to_dict(p):
    return {
        "name": p.name,
        "comment": p.comment,
        "id": p.prop_id,
        "unit": p.unit,
        "value_type": p.value_type,
        "min": p.value_min,
        "max": p.value_max,
        "realized_by": p.realized_by,
        "constraints": [constraint_to_dict(c) for c in p.constraints]
    }

def capability_to_dict(c):
    return {
        "name": c.name,
        "comment": c.comment,
        "id": c.cap_id,
        "properties": [property_to_dict(p) for p in c.properties],
        "generalized_by": c.generalized_by,
        "realized_by": c.realized_by
    }


# # Ergebnisse robust sammeln
# all_capabilities = {}
# for file in files:
#     name = Path(file).stem
#     all_capabilities['resource', name] = parse_capabilities_robust_from_bytes(file)

# #print(all_capabilities)  # Ausgabe der extrahierten Capabilities mit Eigenschaften und Relationen
# data_str_keys = {
#     f"{k[0]}: {k[1]}": v for k, v in all_capabilities.items()
# }

# # Formatierte JSON-Ausgabe mit deutscher Umlaute-Unterstützung
# formatted_json = json.dumps(data_str_keys, indent=4, ensure_ascii=False)
# print(formatted_json)

# with open("capabilities_output.json", "w", encoding="utf-8") as f:
#     json.dump(data_str_keys, f, indent=4, ensure_ascii=False)
