from server import create_app
import pytest
import io
from pathlib import Path
import sys
import textwrap

PROCESS_RDFXML = """<?xml version="1.0"?>
<rdf:RDF xmlns="http://example.com/process#"
     xml:base="http://example.com/process"
     xmlns:owl="http://www.w3.org/2002/07/owl#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
    <owl:Ontology rdf:about="http://example.com/process"/>
    <owl:Class rdf:about="http://example.com/process#ProcessRoot"/>
    <owl:Class rdf:about="http://example.com/process#Mixing">
        <rdfs:subClassOf rdf:resource="http://example.com/process#ProcessRoot"/>
    </owl:Class>
</rdf:RDF>
"""

MATERIAL_RDFXML = """<?xml version="1.0"?>
<rdf:RDF xmlns="http://example.com/material#"
     xml:base="http://example.com/material"
     xmlns:owl="http://www.w3.org/2002/07/owl#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
    <owl:Ontology rdf:about="http://example.com/material"/>
    <owl:Class rdf:about="http://example.com/material#MaterialRoot"/>
    <owl:Class rdf:about="http://example.com/material#Water">
        <rdfs:subClassOf rdf:resource="http://example.com/material#MaterialRoot"/>
    </owl:Class>
</rdf:RDF>
"""

MATERIAL_TURTLE = """@prefix : <http://example.com/turtle/material#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@base <http://example.com/turtle/material/> .

<http://example.com/turtle/material> rdf:type owl:Ontology .
:MaterialRoot rdf:type owl:Class .
:Copper rdf:type owl:Class ;
    rdfs:subClassOf :MaterialRoot .
"""

MANCHESTER_MATERIAL = """Prefix: : <http://example.com/manchester/material#>
Prefix: owl: <http://www.w3.org/2002/07/owl#>
Prefix: rdfs: <http://www.w3.org/2000/01/rdf-schema#>

Ontology: <http://example.com/manchester/material>

Class: :MaterialRoot

Class: :Copper
    SubClassOf: :MaterialRoot
"""

EXTERNAL_NAMESPACE_RDFXML = """<?xml version="1.0"?>
<rdf:RDF xmlns="http://example.com/graph#"
     xml:base="http://example.com/graph"
     xmlns:owl="http://www.w3.org/2002/07/owl#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">
    <owl:Ontology rdf:about="http://example.com/graph"/>
    <owl:Class rdf:about="http://example.com/external#ExternalRoot"/>
    <owl:Class rdf:about="http://example.com/external#ExternalChild">
        <rdfs:subClassOf rdf:resource="http://example.com/external#ExternalRoot"/>
    </owl:Class>
</rdf:RDF>
"""

FILTERED_CLASS_TREE_RDFXML = """<?xml version="1.0"?>
<rdf:RDF xmlns="http://example.com/filter#"
     xml:base="http://example.com/filter"
     xmlns:owl="http://www.w3.org/2002/07/owl#"
     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
     xmlns:xsd="http://www.w3.org/2001/XMLSchema#">
    <owl:Ontology rdf:about="http://example.com/filter"/>
    <owl:Class rdf:about="http://example.com/filter#VisibleRoot">
        <rdfs:label>Visible Root</rdfs:label>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#VisibleChild">
        <rdfs:subClassOf rdf:resource="http://example.com/filter#VisibleRoot"/>
        <rdfs:label>Visible Child</rdfs:label>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#DeprecatedRoot">
        <owl:deprecated rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">true</owl:deprecated>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#DeprecatedIntermediate">
        <rdfs:subClassOf rdf:resource="http://example.com/filter#VisibleRoot"/>
        <rdfs:label>Deprecated Intermediate</rdfs:label>
        <owl:deprecated rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean">true</owl:deprecated>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#Grandchild">
        <rdfs:subClassOf rdf:resource="http://example.com/filter#DeprecatedIntermediate"/>
        <rdfs:label>Grandchild</rdfs:label>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#UnlabeledLeafRoot"/>
    <owl:Class rdf:about="http://example.com/filter#UnlabeledRoot">
        <rdfs:label></rdfs:label>
    </owl:Class>
    <owl:Class rdf:about="http://example.com/filter#ChildOfUnlabeledRoot">
        <rdfs:subClassOf rdf:resource="http://example.com/filter#UnlabeledRoot"/>
        <rdfs:label>Child Of Unlabeled Root</rdfs:label>
    </owl:Class>
</rdf:RDF>
"""


def write_ontology(path, contents):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(contents, encoding="utf-8")


def write_manchester_converter(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        textwrap.dedent(
            """
            import re
            import sys
            from pathlib import Path

            source_path = Path(sys.argv[1])
            target_path = Path(sys.argv[2])
            content = source_path.read_text(encoding='utf-8')

            if 'Ontology:' not in content:
                print('Missing Ontology declaration.', file=sys.stderr)
                raise SystemExit(2)

            ontology_match = re.search(r"Ontology:\\s*<([^>]+)>", content)
            ontology_iri = ontology_match.group(1) if ontology_match else "http://example.com/manchester/generated"

            classes = []
            subclass_map = {}
            current_class = None

            for raw_line in content.splitlines():
                line = raw_line.strip()
                if line.startswith('Class:'):
                    token = line.split('Class:', 1)[1].strip()
                    token = token.rsplit('#', 1)[-1].strip('<>')
                    token = token.lstrip(':')
                    current_class = token
                    classes.append(token)
                elif current_class and line.startswith('SubClassOf:'):
                    token = line.split('SubClassOf:', 1)[1].strip()
                    token = token.rsplit('#', 1)[-1].strip('<>')
                    token = token.lstrip(':')
                    subclass_map[current_class] = token

            lines = [
                '<?xml version="1.0"?>',
                '<rdf:RDF xmlns="{0}#" xml:base="{0}" xmlns:owl="http://www.w3.org/2002/07/owl#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#">'.format(ontology_iri),
                '  <owl:Ontology rdf:about="{0}"/>'.format(ontology_iri),
            ]

            for class_name in classes:
                lines.append('  <owl:Class rdf:about="{0}#{1}">'.format(ontology_iri, class_name))
                if class_name in subclass_map:
                    lines.append('    <rdfs:subClassOf rdf:resource="{0}#{1}"/>'.format(ontology_iri, subclass_map[class_name]))
                lines.append('  </owl:Class>')

            lines.append('</rdf:RDF>')
            target_path.write_text('\\n'.join(lines), encoding='utf-8')
            """
        ).strip(),
        encoding="utf-8",
    )


# is run before the tests
# creates an instance of the webserver
@pytest.fixture
def app(tmp_path):
    app = create_app()
    ontology_root = tmp_path / "ontologies"
    staging_root = ontology_root / "staging"
    mtp_root = tmp_path / "mtp"
    aas_root = tmp_path / "aasx"
    converter_script = tmp_path / "tools" / "manchester_converter.py"
    write_manchester_converter(converter_script)
    app.config.update(
        TESTING=True,
        ONTOLOGY_UPLOAD_ROOT=str(ontology_root),
        ONTOLOGY_STAGING_ROOT=str(staging_root),
        MANCHESTER_CONVERTER_CMD=[sys.executable, str(converter_script), "{input}", "{output}"],
        ONTOLOGY_CONVERTER_TIMEOUT_SECONDS=10,
        MTP_UPLOAD_ROOT=str(mtp_root),
        AAS_UPLOAD_ROOT=str(aas_root),
    )

    write_ontology(ontology_root / "processes" / "ProcessOntology.owl", PROCESS_RDFXML)
    write_ontology(ontology_root / "materials" / "MaterialOntology.owl", MATERIAL_RDFXML)
    write_ontology(mtp_root / "plant.mtp", "<mtp />")
    write_ontology(aas_root / "robot.xml", "<aas />")
    print(app.url_map)
    return app


# is run before the tests
# creates a flask test client based on the webserver
@pytest.fixture
def client(app):
    return app.test_client()


def test_editor(client):
    response = client.get('/general-recipe-editor')
    assert response.status_code == 200

    # check if returned webpage is the same as index.html
    with open("static/index.html", "r") as html:
        index_html_text = html.read()
    
    #remove all line breaks to avoid problems between windows/linux for test runs
    index_html_text = index_html_text.replace('\r', '').replace('\n', '')
    response.text = response.text.replace('\r', '').replace('\n', '')

    assert response.text == index_html_text


def test_static_files(client):
    # iterate over all static files.
    static_dir = "/static/"
    pathlist = Path(static_dir).glob('**/*')
    for path in pathlist:
        # request the file and check if OK
        path_in_str = str(path)
        response = client.get(path_in_str)
        assert response.status_code == 200

        # compare with actual file content
        with open(path_in_str, "r") as html:
            file_text = html.read()

        #remove all line breaks to avoid problems between windows/linux for test runs
        file_text = file_text.replace('\r', '').replace('\n', '')
        response.text = response.text.replace('\r', '').replace('\n', '')
        assert response.text == file_text


def test_get_onto(client):
    response = client.get('/onto/processes')
    assert response.status_code == 200
    assert response.get_json() == ['ProcessOntology.owl']


def test_get_specific_onto(client):
    response = client.get('/onto/processes/ProcessOntology.owl')
    assert response.status_code == 200
    assert "ProcessRoot" in response.get_data(as_text=True)


def test_get_onto_classes(client):
    response = client.get('/onto/processes/ProcessOntology.owl/classes')
    assert response.status_code == 200
    assert response.get_json() == ["Mixing", "ProcessRoot"]


def test_get_onto_class_tree(client):
    response = client.get('/onto/processes/ProcessOntology.owl/class-tree')
    assert response.status_code == 200

    response_obj = response.get_json()
    assert response_obj["rootIris"] == ["http://example.com/process#ProcessRoot"]
    assert response_obj["nodes"]["http://example.com/process#ProcessRoot"]["name"] == "ProcessRoot"
    assert response_obj["nodes"]["http://example.com/process#ProcessRoot"]["label"] == ""
    assert response_obj["nodes"]["http://example.com/process#ProcessRoot"]["iri"] == "http://example.com/process#ProcessRoot"
    assert response_obj["nodes"]["http://example.com/process#ProcessRoot"]["childIris"] == ["http://example.com/process#Mixing"]
    assert response_obj["nodes"]["http://example.com/process#Mixing"]["name"] == "Mixing"
    assert response_obj["nodes"]["http://example.com/process#Mixing"]["label"] == ""
    assert response_obj["nodes"]["http://example.com/process#Mixing"]["iri"] == "http://example.com/process#Mixing"
    assert response_obj["nodes"]["http://example.com/process#Mixing"]["parentIris"] == ["http://example.com/process#ProcessRoot"]


def test_get_onto_class_tree_filters_deprecated_classes_and_unlabeled_leaf_roots(client, app):
    ontology_root = Path(app.config["ONTOLOGY_UPLOAD_ROOT"])
    write_ontology(
        ontology_root / "materials" / "FilteredTree.owl",
        FILTERED_CLASS_TREE_RDFXML,
    )

    response = client.get('/onto/materials/FilteredTree.owl/class-tree')
    assert response.status_code == 200

    response_obj = response.get_json()
    assert set(response_obj["rootIris"]) == {
        "http://example.com/filter#VisibleRoot",
        "http://example.com/filter#UnlabeledRoot",
    }

    assert "http://example.com/filter#DeprecatedRoot" not in response_obj["nodes"]
    assert "http://example.com/filter#DeprecatedIntermediate" not in response_obj["nodes"]
    assert "http://example.com/filter#UnlabeledLeafRoot" not in response_obj["nodes"]

    visible_root = response_obj["nodes"]["http://example.com/filter#VisibleRoot"]
    assert visible_root["label"] == "Visible Root"
    assert set(visible_root["childIris"]) == {
        "http://example.com/filter#VisibleChild",
        "http://example.com/filter#Grandchild",
    }

    grandchild = response_obj["nodes"]["http://example.com/filter#Grandchild"]
    assert grandchild["label"] == "Grandchild"
    assert grandchild["parentIris"] == ["http://example.com/filter#VisibleRoot"]

    unlabeled_root = response_obj["nodes"]["http://example.com/filter#UnlabeledRoot"]
    assert unlabeled_root["label"] == ""
    assert unlabeled_root["childIris"] == ["http://example.com/filter#ChildOfUnlabeledRoot"]


def test_delete_ontology(client, app):
    ontology_root = Path(app.config["ONTOLOGY_UPLOAD_ROOT"])
    ontology_path = ontology_root / "processes" / "ProcessOntology.owl"

    response = client.delete('/onto/processes/ProcessOntology.owl')

    assert response.status_code == 200
    assert response.get_json()["filename"] == "ProcessOntology.owl"
    assert not ontology_path.exists()


def test_get_onto_subclasses(client):
    response = client.get('/onto/processes/ProcessOntology.owl/ProcessRoot/subclasses')
    assert response.status_code == 200

    response_obj = response.get_json()
    assert response_obj[0]["name"] == "ProcessRoot"
    assert response_obj[0]["iri"] == "http://example.com/process#ProcessRoot"
    assert response_obj[0]["children"][0]["name"] == "Mixing"


def test_get_onto_subclasses_by_class_iri(client):
    response = client.get(
        '/onto/processes/ProcessOntology.owl/subclasses',
        query_string={'classIri': 'http://example.com/process#ProcessRoot'}
    )
    assert response.status_code == 200

    response_obj = response.get_json()
    assert response_obj[0]["name"] == "ProcessRoot"
    assert response_obj[0]["iri"] == "http://example.com/process#ProcessRoot"
    assert response_obj[0]["children"][0]["name"] == "Mixing"


def test_get_onto_subclasses_by_class_iri_with_external_namespace(client, app):
    ontology_root = Path(app.config["ONTOLOGY_UPLOAD_ROOT"])
    write_ontology(
        ontology_root / "processes" / "ExternalNamespace.owl",
        EXTERNAL_NAMESPACE_RDFXML,
    )

    response = client.get(
        '/onto/processes/ExternalNamespace.owl/subclasses',
        query_string={'classIri': 'http://example.com/external#ExternalRoot'}
    )
    assert response.status_code == 200

    response_obj = response.get_json()
    assert response_obj[0]["name"] == "ExternalRoot"
    assert response_obj[0]["iri"] == "http://example.com/external#ExternalRoot"
    assert response_obj[0]["children"][0]["name"] == "ExternalChild"


def test_get_onto_subclasses_by_class_iri_requires_query_parameter(client):
    response = client.get('/onto/processes/ProcessOntology.owl/subclasses')
    assert response.status_code == 400

    payload = response.get_json()
    assert "classIri" in payload["error"]


def test_get_onto_subclasses_by_class_iri_returns_404_for_unknown_iri(client):
    response = client.get(
        '/onto/processes/ProcessOntology.owl/subclasses',
        query_string={'classIri': 'http://example.com/process#UnknownRoot'}
    )
    assert response.status_code == 404


def test_post_onto_rdfxml_processes(client):
    response = client.post(
        '/onto/processes',
        data={
            'file': (io.BytesIO(PROCESS_RDFXML.encode('utf-8')), 'UploadedProcess.rdf')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["category"] == "processes"
    assert payload["canonicalFormat"] == "rdfxml"
    assert payload["filename"].endswith(".owl")


def test_post_onto_turtle_materials(client):
    response = client.post(
        '/onto/materials',
        data={
            'file': (io.BytesIO(MATERIAL_TURTLE.encode('utf-8')), 'Copper.ttl')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["category"] == "materials"
    assert payload["detectedFormat"] == "turtle"

    classes_response = client.get(f'/onto/materials/{payload["filename"]}/classes')
    assert classes_response.status_code == 200
    assert classes_response.get_json() == ["Copper", "MaterialRoot"]


def test_post_onto_manchester_materials(client):
    response = client.post(
        '/onto/materials',
        data={
            'file': (io.BytesIO(MANCHESTER_MATERIAL.encode('utf-8')), 'ManchesterMaterial.owl')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["category"] == "materials"
    assert payload["detectedFormat"] == "manchester"

    classes_response = client.get(f'/onto/materials/{payload["filename"]}/classes')
    assert classes_response.status_code == 200
    assert classes_response.get_json() == ["Copper", "MaterialRoot"]


def test_post_onto_invalid_returns_422(client):
    response = client.post(
        '/onto/materials',
        data={
            'file': (io.BytesIO(b'not an ontology'), 'broken.owl')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 422
    payload = response.get_json()
    assert "unsupported" in payload["error"].lower() or "invalid" in payload["error"].lower()


def test_post_onto_manchester_without_converter_returns_422(client, app):
    app.config["MANCHESTER_CONVERTER_CMD"] = []
    app.config["MANCHESTER_CONVERTER_AUTO_DISCOVERY"] = False

    response = client.post(
        '/onto/materials',
        data={
            'file': (io.BytesIO(MANCHESTER_MATERIAL.encode('utf-8')), 'ManchesterMaterial.owl')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 422
    payload = response.get_json()
    assert "conversion is not configured" in payload["details"].lower()


def test_delete_mtp_file(client, app):
    mtp_path = Path(app.config["MTP_UPLOAD_ROOT"]) / "plant.mtp"

    response = client.delete('/mtp/plant.mtp')

    assert response.status_code == 200
    assert response.get_json()["filename"] == "plant.mtp"
    assert not mtp_path.exists()


def test_delete_aas_file(client, app):
    aas_path = Path(app.config["AAS_UPLOAD_ROOT"]) / "robot.xml"

    response = client.delete('/aas/robot.xml')

    assert response.status_code == 200
    assert response.get_json()["filename"] == "robot.xml"
    assert not aas_path.exists()


def test_get_onto_skips_invalid_files(client, app):
    ontology_root = Path(app.config["ONTOLOGY_UPLOAD_ROOT"])
    write_ontology(ontology_root / "processes" / "broken.owl", "not an ontology")

    response = client.get('/onto/processes')
    assert response.status_code == 200
    assert response.get_json() == ['ProcessOntology.owl']


def test_collision_adds_date_prefix(client, app):
    ontology_root = Path(app.config["ONTOLOGY_UPLOAD_ROOT"])
    write_ontology(ontology_root / "processes" / "duplicate.owl", PROCESS_RDFXML)

    response = client.post(
        '/onto/processes',
        data={
            'file': (io.BytesIO(PROCESS_RDFXML.encode('utf-8')), 'duplicate.rdf')
        },
        content_type='multipart/form-data'
    )

    assert response.status_code == 201
    assert response.get_json()["filename"] != "duplicate.owl"
    assert response.get_json()["filename"].endswith("duplicate.owl")

#### TODO: re-enable when validation is correct
# def test_validate(client):
#     #only the first level opining and closing element
#     response = client.get('/grecipe/validate', query_string={'xml_string': '<p0:GRecipe xmlns:p0="http://www.mesa.org/xml/B2MML"></p0:GRecipe>'})
#     assert response.status_code == 200
    
#     #the generated string when hitting export
#     response = client.get('/grecipe/validate', query_string={'xml_string': '<p0:GRecipe xmlns:p0="http://www.mesa.org/xml/B2MML"><p0:ID/><p0:Description/><p0:GRecipeType>General</p0:GRecipeType><p0:Formula><p0:ProcessInputs><p0:ID>inputid</p0:ID><p0:MaterialsType>Input</p0:MaterialsType></p0:ProcessInputs><p0:ProcessOutputs><p0:ID>outputsid</p0:ID><p0:MaterialsType>Output</p0:MaterialsType></p0:ProcessOutputs><p0:ProcessIntermediates><p0:ID>intermediateid</p0:ID><p0:MaterialsType>Intermediate</p0:MaterialsType></p0:ProcessIntermediates></p0:Formula><p0:ProcessProcedure><p0:ID>Procedure1</p0:ID><p0:ProcessElementType>Process</p0:ProcessElementType></p0:ProcessProcedure><p0:ResourceConstraint/><p0:OtherInformation/></p0:GRecipe>'})
#     assert response.status_code == 200
    
#     # Add more test assertions as needed
# Add more tests as new endpoints are added
EMPTY_GENERAL_RECIPE_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<b2mml:GRecipe xmlns:b2mml="http://www.mesa.org/xml/B2MML">
  <b2mml:ID>testID</b2mml:ID>
  <b2mml:Description/>
  <b2mml:GRecipeType>General</b2mml:GRecipeType>
  <b2mml:Formula>
    <b2mml:Description>The formula defines the Inputs, Intermediates and Outputs of the Procedure</b2mml:Description>
    <b2mml:ProcessInputs>
      <b2mml:ID>inputid</b2mml:ID>
      <b2mml:Description>List of Process Inputs</b2mml:Description>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
    </b2mml:ProcessInputs>
    <b2mml:ProcessOutputs>
      <b2mml:ID>outputsid</b2mml:ID>
      <b2mml:Description>List of Process Outputs</b2mml:Description>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
    </b2mml:ProcessOutputs>
    <b2mml:ProcessIntermediates>
      <b2mml:ID>intermediateid</b2mml:ID>
      <b2mml:Description>List of Process Intermediates</b2mml:Description>
      <b2mml:MaterialsType>Intermediate</b2mml:MaterialsType>
    </b2mml:ProcessIntermediates>
  </b2mml:Formula>
  <b2mml:ProcessProcedure>
    <b2mml:ID>Procedure1</b2mml:ID>
    <b2mml:Description>This is the top level ProcessElement</b2mml:Description>
    <b2mml:ProcessElementType>Process</b2mml:ProcessElementType>
    <b2mml:Materials>
      <b2mml:ID>Procedure1InputMaterials</b2mml:ID>
      <b2mml:Description>Input Materials of ProcessProcedure1</b2mml:Description>
      <b2mml:MaterialsType>Input</b2mml:MaterialsType>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>Procedure1IntermediateMaterials</b2mml:ID>
      <b2mml:Description>Intermediate Materials of ProcessProcedure1</b2mml:Description>
      <b2mml:MaterialsType>Intermediate</b2mml:MaterialsType>
    </b2mml:Materials>
    <b2mml:Materials>
      <b2mml:ID>Procedure1OutputMaterials</b2mml:ID>
      <b2mml:Description>Output Materials of ProcessProcedure1</b2mml:Description>
      <b2mml:MaterialsType>Output</b2mml:MaterialsType>
    </b2mml:Materials>
  </b2mml:ProcessProcedure>
</b2mml:GRecipe>
"""


def test_validate_empty_general_recipe_export(client):
    response = client.get(
        '/grecipe/validate',
        query_string={'xml_string': EMPTY_GENERAL_RECIPE_XML}
    )
    assert response.status_code == 200
    assert response.get_data(as_text=True) == 'valid!'


def test_create_master_recipe_includes_transitions_links_and_pretty_print(client):
    payload = {
        "listHeader": {
            "id": "ListHeader001",
            "createDate": "2026-03-20T10:00:00Z",
        },
        "description": "Imported batch information",
        "masterRecipe": {
            "id": "MasterRecipe001",
            "version": "1.2.3",
            "versionDate": "2026-03-20T10:00:00Z",
            "description": "Imported master recipe",
            "header": {
                "productId": "Product001",
                "productName": "Imported Product",
            },
            "equipmentRequirement": [
                {
                    "b2mml:ID": "REQ-1",
                    "b2mml:Constraint": {
                        "b2mml:ID": "REQ-1_constraint",
                        "b2mml:Condition": "Material == H2O",
                    },
                    "b2mml:Description": "Only water is allowed",
                }
            ],
            "formula": {
                "description": "Formula description",
                "parameter": [
                    {
                        "b2mml:ID": "001:ParamTemp",
                        "b2mml:Description": "001:Temperature",
                        "b2mml:ParameterType": "ProcessParameter",
                        "b2mml:ParameterSubType": "ST",
                        "b2mml:Value": {
                            "b2mml:ValueString": "80",
                            "b2mml:DataInterpretation": "Constant",
                            "b2mml:DataType": "temperature",
                            "b2mml:UnitOfMeasure": "C",
                        },
                    }
                ],
                "material": [],
            },
            "procedureLogic": {
                "link": [
                    {
                        "b2mml:ID": "L1",
                        "b2mml:FromID": {
                            "b2mml:FromIDValue": "S1",
                            "b2mml:FromType": "Step",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:ToID": {
                            "b2mml:ToIDValue": "T1",
                            "b2mml:ToType": "Transition",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:LinkType": "ControlLink",
                        "b2mml:Depiction": "LineAndArrow",
                        "b2mml:EvaluationOrder": "1",
                        "b2mml:Description": "Link from S1 to T1",
                    },
                    {
                        "b2mml:ID": "L2",
                        "b2mml:FromID": {
                            "b2mml:FromIDValue": "T1",
                            "b2mml:FromType": "Transition",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:ToID": {
                            "b2mml:ToIDValue": "S2",
                            "b2mml:ToType": "Step",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:LinkType": "ControlLink",
                        "b2mml:Depiction": "LineAndArrow",
                        "b2mml:EvaluationOrder": "1",
                        "b2mml:Description": "Link from T1 to S2",
                    },
                    {
                        "b2mml:ID": "L3",
                        "b2mml:FromID": {
                            "b2mml:FromIDValue": "S2",
                            "b2mml:FromType": "Step",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:ToID": {
                            "b2mml:ToIDValue": "T2",
                            "b2mml:ToType": "Transition",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:LinkType": "ControlLink",
                        "b2mml:Depiction": "LineAndArrow",
                        "b2mml:EvaluationOrder": "1",
                        "b2mml:Description": "Link from S2 to T2",
                    },
                    {
                        "b2mml:ID": "L4",
                        "b2mml:FromID": {
                            "b2mml:FromIDValue": "T2",
                            "b2mml:FromType": "Transition",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:ToID": {
                            "b2mml:ToIDValue": "S3",
                            "b2mml:ToType": "Step",
                            "b2mml:IDScope": "External",
                        },
                        "b2mml:LinkType": "ControlLink",
                        "b2mml:Depiction": "LineAndArrow",
                        "b2mml:EvaluationOrder": "1",
                        "b2mml:Description": "Link from T2 to S3",
                    },
                ],
                "step": [
                    {
                        "b2mml:ID": "S1",
                        "b2mml:RecipeElementID": "Init",
                        "b2mml:RecipeElementVersion": "",
                        "b2mml:Description": "Init",
                    },
                    {
                        "b2mml:ID": "S2",
                        "b2mml:RecipeElementID": "001:ProcHeat",
                        "b2mml:RecipeElementVersion": "",
                        "b2mml:Description": "001:Heat Step",
                    },
                    {
                        "b2mml:ID": "S3",
                        "b2mml:RecipeElementID": "End",
                        "b2mml:RecipeElementVersion": "",
                        "b2mml:Description": "End",
                    },
                ],
                "transition": [
                    {
                        "b2mml:ID": "T1",
                        "b2mml:Condition": "True",
                        "b2mml:Description": "True transition",
                    },
                    {
                        "b2mml:ID": "T2",
                        "b2mml:Condition": "Step 001:Heat Step is Completed",
                        "b2mml:Description": "Imported condition",
                    },
                ],
            },
            "recipeElement": [
                {
                    "b2mml:ID": "Init",
                    "b2mml:Description": "Init",
                    "b2mml:RecipeElementType": "Begin",
                },
                {
                    "b2mml:ID": "001:ProcHeat",
                    "b2mml:Description": "Heating Procedure",
                    "b2mml:RecipeElementType": "Operation",
                    "b2mml:ActualEquipmentID": "EQ-1",
                    "b2mml:EquipmentRequirement": [
                        {
                            "b2mml:ID": "REQ-1",
                            "b2mml:Description": "Only water is allowed",
                        }
                    ],
                    "b2mml:Parameter": [
                        {
                            "b2mml:ID": "001:ParamTemp",
                            "b2mml:Description": "Temperature",
                            "b2mml:ParameterType": "ProcessParameter",
                            "b2mml:ParameterSubType": "ST",
                        }
                    ],
                },
                {
                    "b2mml:ID": "End",
                    "b2mml:Description": "End",
                    "b2mml:RecipeElementType": "End",
                },
            ],
        },
        "equipmentElement": [
            {
                "b2mml:ID": "EQ-1",
                "b2mml:Description": "Heating Unit instance",
                "b2mml:EquipmentElementType": "Other",
                "b2mml:EquipmentElementLevel": "EquipmentModule",
                "b2mml:EquipmentProceduralElement": [
                    {
                        "b2mml:ID": "ProcHeat",
                        "b2mml:Description": "Heating Library Procedure",
                        "b2mml:EquipmentProceduralElementType": "Procedure",
                        "b2mml:Parameter": [
                            {
                                "b2mml:ID": "ParamTemp",
                                "b2mml:Description": "Temperature",
                                "b2mml:ParameterType": "ProcessParameter",
                                "b2mml:ParameterSubType": "ST",
                                "b2mml:Value": {
                                    "b2mml:ValueString": "80",
                                    "b2mml:DataInterpretation": "Constant",
                                    "b2mml:DataType": "temperature",
                                    "b2mml:UnitOfMeasure": "C",
                                },
                            }
                        ],
                    }
                ],
                "b2mml:EquipmentConnection": [],
            }
        ],
    }

    response = client.post('/api/recipe/master', json=payload)
    xml_text = response.get_data(as_text=True)

    assert response.status_code == 200
    assert '\n  <b2mml:ListHeader>' in xml_text
    assert xml_text.count('<b2mml:Transition>') == 2
    assert xml_text.count('<b2mml:Link>') == 4
    assert '<b2mml:RecipeElementID>001:ProcHeat</b2mml:RecipeElementID>' in xml_text
    assert '<b2mml:Condition>Step 001:Heat Step is Completed</b2mml:Condition>' in xml_text
    assert '<b2mml:Description>Imported condition</b2mml:Description>' in xml_text
    assert '<b2mml:ID>ProcHeat</b2mml:ID>' in xml_text
