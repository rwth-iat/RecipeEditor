from flask import Blueprint, request, make_response, send_from_directory
import os
import mimetypes
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
from Functions import upload_file
import owlready2
import json
from django.utils.encoding import iri_to_uri, uri_to_iri

ONTO_FOLDER = "ontologies/"
UPLOAD_FOLDER = './upload/'


def recursivly_add_subclasses(super_class):
    output_obj = {
                "name": str(super_class).split(".")[-1],
                "otherInformation":[{
                            "otherInfoID":"SemanticDescription",
                            "description":["URI referencing the Ontology Class definition"],
                            "otherValue":[{
                                "valueString": iri_to_uri(super_class.iri),
                                "dataType":"uriReference",
                                "key":str(super_class)
                            }]
                        }],
                "children": []
            }
    if super_class is not None:
        subclasses_list = list(super_class.subclasses())
        if subclasses_list != []:
            for subclass in subclasses_list:
                child = recursivly_add_subclasses(subclass)
                output_obj["children"].append(child)
    return output_obj


def add_subclasses(input_object, children_classes_list, super_class_name):
    # initiate input Object
    input_object[super_class_name] = {
        "name": super_class_name,
        "children": []
    }
    # generate object from Ontologie 
    for entry in children_classes_list:
        entry_str = str(entry).split(".")[-1]
        input_object[super_class_name]["children"].append({
            "type": "process",
            "name": entry_str
        })

    return input_object


def load_ontologies():
    ontologies = {}
    base_dir = os.path.join(UPLOAD_FOLDER, ONTO_FOLDER)
    world = owlready2.World()
    owlready2.onto_path.append(base_dir)  # erlaubt lokale Auflösung von owl:imports
    for filename in os.listdir(base_dir):
        if filename.endswith('.owl'):
            complete_path = os.path.join(base_dir, filename)
            ontologies[filename] = world.get_ontology(complete_path).load(only_local=True)
    return ontologies


ontology_api = Blueprint('ontology_api', __name__)

@ontology_api.route('/onto', methods=['POST'])
def upload_onto():
    """Endpoint to upload a new ontologie to the server.
    ---
    tags:
      - Ontologies
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
    upload_file(request, "ontologies")
    

# Method to load an ontology
@ontology_api.route('/onto', methods=['GET'])
def get_onto():
    """Endpoint returning the list of Ontology names currently present at the server.
    ---
    tags:
      - Ontologies
    responses:
      200:
        description: A list of the currently available Ontologies
        examples:
          rgb: ['Ontocap', 'acplt']
    """
    # if get return list of ontologies
    ontologies = load_ontologies()
    response = make_response(list(ontologies.keys()))
    return response

@ontology_api.route('/onto/<path:filename>')
def download_onto(filename):
    """Endpoint to download an ontologie from the server.
    ---
    tags:
      - Ontologies
    parameters:
      - name: filename
        in: path
        type: string
        required: true
        default: c4i.owl
    responses:
      200:
        description: 
        examples:
            rgb: ['red', 'green', 'blue']
    """
    response = make_response(send_from_directory(os.path.join(UPLOAD_FOLDER, ONTO_FOLDER), filename))
    mimetype, _ = mimetypes.guess_type(filename)
    response.headers['Content-Type'] = mimetype
    return response

@ontology_api.route('/onto/<onto_name>/classes')
def get_classes(onto_name, methods=['GET']):
    """Endpoint returning the list of classes present at the Ontology specified in <onto_name>.
    ---
    tags:
      - Ontologies
    parameters:
      - name: onto_name
        in: path
        type: string
        required: true
        default: all
      - name: file
        in: path
        type: file
        required: true
        default: all
    responses:
      200:
        description: A list of the classes in given Ontology.
    """
    # returns a generator therefore we need list()
    ontologies = load_ontologies()
    classes = list(ontologies[onto_name].classes())
    classes = [item.name for item in classes]
    response = make_response(classes)
    return response

@ontology_api.route('/onto/<onto_name>/<super_class>/subclasses')
def get_subclasses(onto_name="acplt", super_class="GeneralCapabilityEffecting"):
    """Endpoint to get all subclasses of a class in the given ontology.
    ---
    tags:
      - Ontologies
    parameters:
      - name: onto_name
        in: path
        type: string
        required: true
        default: acplt
      - name: super_class
        in: path
        type: string
        required: true
        default: GeneralCapabilityEffecting
    responses:
      200:
        description: A list Subclasses and their respective subclasses
        examples:
            rgb: [{
                    "name": "GeneralCapabilityEffecting",
                    "type":"process",
                    "children":[
                        {
                        "name": "Draining",
                        "type":"process",
                        "children":[]
                        },
                        {
                        "type": "process",
                        "name": "Pumping"
                        }
                    ]
                }]
    """
    classes_obj = {}
    ontologies = load_ontologies()
    onto = ontologies[onto_name]
    # subclasses_list = list(onto[super_class].subclasses())
    super_class_obj = onto[super_class]
    classes_obj = recursivly_add_subclasses(super_class_obj)
    classes_list = [classes_obj]
    # classes_dict = add_subclasses(classes_dict, subclasses_list, super_class)
    processes = json.dumps(classes_list, ensure_ascii=False, indent=4)
    response = make_response(processes)
    return response