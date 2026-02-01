# webserver
from flask import Flask, jsonify, send_from_directory, make_response, redirect, request, flash
from waitress import serve #this is for the production server
from flasgger import Swagger
from zipfile import ZipFile
import os

# utils
import mimetypes
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

from RecipeAPI import recipe_api, get_all_recipe_capabilities
from OntologyAPI import ontology_api
from AasAPI import aas_api, get_all_aasx_capabilities, get_all_aas_capabilities, get_aasx_id, parse_aas_equipment_info
from MtpApi import parse_mtp_aml, pea_to_dict, get_filtered_equipment_info, get_master_recipe_equipment_info
from AASxmlCapabilityParser import parse_capabilities_robust_from_bytes
from Functions import upload_file, allowed_file
from werkzeug.utils import secure_filename

ontologies = {}
aas = {}


UPLOAD_FOLDER = './upload/'
ONTO_FOLDER = "ontologies/"
AAS_FOLDER = "aasx/"
MTP_FOLDER = "mtp/"
RECIPE_FOLDER = "recipes/"

def extract_zip(input_zip):
    input_zip=ZipFile(input_zip)
    return {name: input_zip.read(name) for name in input_zip.namelist()}

def create_app():
    app = Flask(__name__)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.secret_key = 'super secret key'
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SWAGGER'] = {
        'uiversion': 3,
        "specs_route": "/apidocs/",
        'title': 'API Recipe Editor',
        "description": """API for the *Recipe Editor*, which are created according to ANSI/ISA-88 in BatchML. The API provides endpoints for the General- and Master Recipes Editor, interfaces for processing of MTP (Modular Type Package) files and AAS (Asset Administration Shell) files, as well as operations for validation, and management of ontologies, recipes and AAS files.
                          """,
        "version": "0.0.1",
        "contact": {
            "name": "Michael Winter",
            "email": "m.winter@iat.rwth-aachen.de"
        }
    }

    @app.route('/')
    def hello():
        """Endpoint to also redirect only the ip+port to the Graphical Editor.
        ---
        tags:
          - General Recipe Editor
        responses:
          "302":
            description: redirects to /general-recipe.
            examples:
              rgb: ['red', 'green', 'blue']
        """
        return redirect("/general-recipe-editor", code=302)
      
    # Main Website
    @app.route("/general-recipe-editor")
    def editor():
        """Endpoint to the Graphical Editor for General Recipes.
        ---
        tags:
          - General Recipe Editor
        responses:
          "200":
            description: The html file of the Graphical Editor UI.
            examples:
              rgb: ['red', 'green', 'blue']
        """
        return app.send_static_file("index.html")


    @app.route("/master-recipe-editor")
    def master_recipe():
        """Endpoint to the Graphical Editor for Master Recipes.
        ---
        tags:
          - Master Recipe Editor
        responses:
          "200":
            description: The html file of the Graphical Editor UI.
            examples:
              rgb: ['red', 'green', 'blue']
        """
        return app.send_static_file("index.html")


    @app.route('/parse-mtp', methods=['POST'])
    def parse_mtp_endpoint():
      
      file = request.files.get("file")
      if not file:
          return jsonify({"error": "No file uploaded"}), 400

      try:
          content = file.read()
          pea = parse_mtp_aml(content)
          result = pea_to_dict(pea)
          return jsonify(result)
      except Exception as e:
          return jsonify({"error": f"Failed to parse file {file.filename}: {str(e)}"}), 400


    @app.route('/parse-aas', methods=['POST'])
    def parse_aas_endpoint():
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        try:
            content = file.read()  # bytes
            capabilities = parse_capabilities_robust_from_bytes(content)
            return jsonify(capabilities)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
          
    # MTP file management endpoints
    @app.route('/mtp', methods=['GET'])
    def list_mtp_files():
        """Endpoint to get list of available MTP files on the server.
        ---
        tags:
          - MTP
        responses:
          "200":
            description: List of MTP files
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER)
            if not os.path.exists(mtp_path):
                os.makedirs(mtp_path)
            
            files = [f for f in os.listdir(mtp_path) if f.endswith(('.mtp', '.aml'))]
            return jsonify(files)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/mtp', methods=['POST'])
    def upload_mtp():
        """Endpoint to upload a new MTP file to the server.
        ---
        tags:
          - MTP
        parameters:
          - name: file
            in: formData
            type: file
            required: true
        responses:
          "200":
            description: Upload successful
        """
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER)
            if not os.path.exists(mtp_path):
                os.makedirs(mtp_path)
            
            filepath = os.path.join(mtp_path, filename)
            file.save(filepath)
            return jsonify({"message": "MTP file uploaded successfully"}), 200
        
        return jsonify({"error": "File type not allowed"}), 400

    @app.route('/mtp/<filename>', methods=['GET'])
    def get_mtp_file(filename):
        """Endpoint to get a specific MTP file from the server.
        ---
        tags:
          - MTP
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: MTP file content
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER)
            return send_from_directory(mtp_path, filename)
        except Exception as e:
            return jsonify({"error": str(e)}), 404

    @app.route('/mtp/<filename>/parse', methods=['GET'])
    def parse_stored_mtp(filename):
        """Endpoint to parse a stored MTP file.
        ---
        tags:
          - MTP
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Parsed MTP data
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER, filename)
            if not os.path.exists(mtp_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(mtp_path, 'rb') as f:
                content = f.read()
            
            pea = parse_mtp_aml(content)
            result = pea_to_dict(pea)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": f"Failed to parse file {filename}: {str(e)}"}), 400

    @app.route('/mtp/<filename>/equipment-info', methods=['GET'])
    def get_mtp_equipment_info(filename):
        """Endpoint to get equipment information from a stored MTP file.
        ---
        tags:
          - MTP
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Equipment information from MTP file
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER, filename)
            if not os.path.exists(mtp_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(mtp_path, 'rb') as f:
                content = f.read()
            
            pea = parse_mtp_aml(content)
            result = pea_to_dict(pea)
            
            # Extract equipment info for PropertyWindow display
            equipment_info = {
                "source_file": filename,
                "source_type": "MTP",
                "equipment_data": result.get("equipment_info", {})
            }
            
            return jsonify(equipment_info)
        except Exception as e:
            return jsonify({"error": f"Failed to get equipment info from file {filename}: {str(e)}"}), 400

    @app.route('/mtp/<filename>/equipment-info/<process_name>', methods=['GET'])
    def get_mtp_filtered_equipment_info(filename, process_name):
        """Endpoint to get filtered equipment information for a specific process from a stored MTP file.
        ---
        tags:
          - MTP
        parameters:
          - name: filename
            in: path
            type: string
            required: true
          - name: process_name
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Filtered equipment information for specific process
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER, filename)
            if not os.path.exists(mtp_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(mtp_path, 'rb') as f:
                content = f.read()
            
            pea = parse_mtp_aml(content)
            filtered_equipment = get_filtered_equipment_info(pea, process_name)
            
            # Structure the response for PropertyWindow
            equipment_info = {
                "source_file": filename,
                "source_type": "MTP",
                "equipment_data": filtered_equipment,
                "target_process": process_name
            }
            
            return jsonify(equipment_info)
        except Exception as e:
            return jsonify({"error": f"Failed to get filtered equipment info from file {filename}: {str(e)}"}), 400

    @app.route('/mtp/<filename>/master-recipe-equipment/<process_name>', methods=['GET'])
    def get_mtp_master_recipe_equipment_info(filename, process_name):
        """Endpoint to get master recipe specific equipment information for a specific process.
        ---
        tags:
          - MTP
        parameters:
          - name: filename
            in: path
            type: string
            required: true
          - name: process_name
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Master recipe specific equipment information
        """
        try:
            mtp_path = os.path.join(UPLOAD_FOLDER, MTP_FOLDER, filename)
            if not os.path.exists(mtp_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(mtp_path, 'rb') as f:
                content = f.read()
            
            pea = parse_mtp_aml(content)
            master_recipe_equipment = get_master_recipe_equipment_info(pea, process_name)
            
            # Structure the response for PropertyWindow
            equipment_info = {
                "source_file": filename,
                "source_type": "MTP",
                "equipment_data": master_recipe_equipment,
                "target_process": process_name
            }
            
            return jsonify(equipment_info)
        except Exception as e:
            return jsonify({"error": f"Failed to get master recipe equipment info from file {filename}: {str(e)}"}), 400

    # AAS file management endpoints
    @app.route('/aas', methods=['GET'])
    def list_aas_files():
        """Endpoint to get list of available AAS files on the server.
        ---
        tags:
          - AAS
        responses:
          "200":
            description: List of AAS files
        """
        try:
            aas_path = os.path.join(UPLOAD_FOLDER, AAS_FOLDER)
            if not os.path.exists(aas_path):
                os.makedirs(aas_path)
            
            files = [f for f in os.listdir(aas_path) if f.endswith('.xml')]
            return jsonify(files)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/aas', methods=['POST'])
    def upload_aas():
        """Endpoint to upload a new AAS file to the server.
        ---
        tags:
          - AAS
        parameters:
          - name: file
            in: formData
            type: file
            required: true
        responses:
          "200":
            description: Upload successful
        """
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            aas_path = os.path.join(UPLOAD_FOLDER, AAS_FOLDER)
            if not os.path.exists(aas_path):
                os.makedirs(aas_path)
            
            filepath = os.path.join(aas_path, filename)
            file.save(filepath)
            return jsonify({"message": "AAS file uploaded successfully"}), 200
        
        return jsonify({"error": "File type not allowed"}), 400

    @app.route('/aas/<filename>', methods=['GET'])
    def get_aas_file(filename):
        """Endpoint to get a specific AAS file from the server.
        ---
        tags:
          - AAS
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: AAS file content
        """
        try:
            aas_path = os.path.join(UPLOAD_FOLDER, AAS_FOLDER)
            return send_from_directory(aas_path, filename)
        except Exception as e:
            return jsonify({"error": str(e)}), 404

    @app.route('/aas/<filename>/parse', methods=['GET'])
    def parse_stored_aas(filename):
        """Endpoint to parse a stored AAS file.
        ---
        tags:
          - AAS
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Parsed AAS data
        """
        try:
            aas_path = os.path.join(UPLOAD_FOLDER, AAS_FOLDER, filename)
            if not os.path.exists(aas_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(aas_path, 'rb') as f:
                content = f.read()
            
            capabilities = parse_capabilities_robust_from_bytes(content)
            return jsonify(capabilities)
        except Exception as e:
            return jsonify({"error": f"Failed to parse file {filename}: {str(e)}"}), 400

    @app.route('/aas/<filename>/equipment-info', methods=['GET'])
    def get_aas_equipment_info(filename):
        """Endpoint to get equipment information from a stored AAS file.
        ---
        tags:
          - AAS
        parameters:
          - name: filename
            in: path
            type: string
            required: true
        responses:
          "200":
            description: Equipment information from AAS file
        """
        try:
            aas_path = os.path.join(UPLOAD_FOLDER, AAS_FOLDER, filename)
            if not os.path.exists(aas_path):
                return jsonify({"error": "File not found"}), 404
            
            with open(aas_path, 'rb') as f:
                content = f.read()
            
            # Get equipment info using the new function
            equipment_data = parse_aas_equipment_info(content)
            
            # Structure the response for PropertyWindow
            equipment_info = {
                "source_file": filename,
                "source_type": "AAS",
                "equipment_data": equipment_data
            }
            
            return jsonify(equipment_info)
        except Exception as e:
            return jsonify({"error": f"Failed to get equipment info from file {filename}: {str(e)}"}), 400

    # Make the other static files availible.
    # When index.html is opened from the "editor endpoint" the javascript and css and logo etc can get loaded by the client
    @app.route('/<path:filename>')
    def static_files(filename):
        """Endpoint to serve the static files to the server.
            This is needed in order for the Graphical Editor to work, as index.html links to the css and JS file in static folder.
        ---
        tags:
          - General Recipe Editor
        parameters:
          - name: filename
            in: path
            type: string
            required: true
            default: /assets/index-4ed49a4e.css
        responses:
          "200":
            description: The requested File
            examples:
              rgb: ['red', 'green', 'blue']
        """
        response = make_response(send_from_directory(app.static_folder, filename))
        mimetype, _ = mimetypes.guess_type(filename)
        response.headers['Content-Type'] = mimetype
        return response

    '''
    @app.route('/CapabilityMatching/AAS/basic', methods=['POST'])
    def check_capabilities_basic():
        """Endpoint to check if all needed capabilities of a recipe can be realized by a given AAS.
        ---
        tags:
          - Capability Matching
        parameters:
          - name: aas
            in: formData
            type: file
            required: true
          - name: recipe
            in: formData
            type: file
            required: true
        responses:
          "200":
            description: The requested File
            examples:
              rgb: ['red', 'green', 'blue']
        """
        if 'aasx' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        aasx = request.files['aasx']
        aasx_content = aasx.read()
        aasx_capabilities = get_all_aasx_capabilities(aasx_content) 


        if 'recipe' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        recipe = request.files['recipe']
        recipe_content = recipe.read()
        recipe_capabilities = get_all_recipe_capabilities(recipe_content)
        
        # Extract unique IDs from list A and list B
        unique_aasx_capabilities = set(item['IRI'] for item in aasx_capabilities)
        unique_recipe_capabilities = set(item['IRI'] for item in recipe_capabilities)

        print(unique_recipe_capabilities)
        print(unique_aasx_capabilities)
        
        # Check if all IDs in recipe are in aasx
        if unique_recipe_capabilities.issubset(unique_aasx_capabilities):
            string = "Every Capability IRI that occurs in Recipe is also in AASX (positive case)."
            print(string)
            return make_response(string, 200)
        else:
            string = "There are Capability IRIS in Recipe  that are not in AASX (negative case)." 
            print(string)        
            return make_response(string + str(unique_recipe_capabilities.difference(unique_aasx_capabilities)), 400)
    '''
    
    @app.route('/CapabilityMatching/AAS', methods=['POST'])
    def check_capabilities_complex():
        """Endpoint to match Capabilities of a zip file with ".xml" AAS files and a general Recipe.
        ---
        tags:
          - Capability Matching
        parameters:
          - name: aas
            in: formData
            type: file
            required: true
            description: aas or zip file of aas files
          - name: recipe
            in: formData
            type: file
            required: true
        responses:
          "200":
            description: The requested File
            examples:
              rgb: ['red', 'green', 'blue']
        """
        found_capabilities = []
        
        if 'recipe' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        recipe = request.files['recipe']
        recipe_content = recipe.read()
        recipe_capabilities = get_all_recipe_capabilities(recipe_content)
        unique_recipe_capabilities = set(item['IRI'] for item in recipe_capabilities)
        
        if 'aas' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        aasx_zip = request.files['aas']
        aasx_files = extract_zip(aasx_zip)
        for element in unique_recipe_capabilities:
          for filename in aasx_files:
            aasx = aasx_files[filename] 
            aasx_capabilities = get_all_aas_capabilities(aasx)
            unique_aasx_capabilities = set(item['IRI'] for item in aasx_capabilities)
            if element in unique_aasx_capabilities:
              print("found capability: " + element)
              aasxids = get_aasx_id(aasx)
              found_capabilities.append("capability: "+element+" can be realized by aas: " + str(aasxids)) 
            else:
              print("did not find capability"+ element)

        # Extract unique IDs from list A and list B
        #unique_aasx_capabilities = set(item['IRI'] for item in aasx_capabilities)
        #unique_recipe_capabilities = set(item['IRI'] for item in recipe_capabilities)
        
        # Check if all IDs in recipe are in aasx
        if len(found_capabilities)>0:
            string=""
            for capability in found_capabilities:
              string = string + capability + "\r\n"
            print(string)
            return make_response(string, 200)
        else:
            string = "There are no Capability IRIS in Recipe that can be realized by an given AAS." 
            print(string)        
            return make_response(string, 200)
          
    @app.route('/CapabilityMatching/AASX', methods=['POST'])
    def capability_Matching_AASX():
        """Endpoint to Match Capabilities of an AASX and a General Recipe.
        ---
        tags:
          - Capability Matching
        parameters:
          - name: aasx
            in: formData
            type: file
            required: true
            description: aas or zip file of aas files
          - name: recipe
            in: formData
            type: file
            required: true
        responses:
          "200":
            description: The requested File
            examples:
              rgb: ['red', 'green', 'blue']
        """
        found_capabilities = []
        
        if 'recipe' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        recipe = request.files['recipe']
        recipe_content = recipe.read()
        recipe_capabilities = get_all_recipe_capabilities(recipe_content)
        unique_recipe_capabilities = set(item['IRI'] for item in recipe_capabilities)
        
        if 'aasx' not in request.files:
          print("no file given")
          flash('No file part')
          return make_response(request.url, 400)
        aasx_zip = request.files['aasx']
        aasx_files = extract_zip(aasx_zip)
        for element in unique_recipe_capabilities:
          for filename in aasx_files:
            aasx = aasx_files[filename] 
            aasx_capabilities = get_all_aas_capabilities(aasx)
            unique_aasx_capabilities = set(item['IRI'] for item in aasx_capabilities)
            if element in unique_aasx_capabilities:
              print("found capability: " + element)
              aasxids = get_aasx_id(aasx)
              found_capabilities.append("capability: "+element+" can be realized by aas: " + str(aasxids)) 
            else:
              print("did not find capability"+ element)

        # Extract unique IDs from list A and list B
        #unique_aasx_capabilities = set(item['IRI'] for item in aasx_capabilities)
        #unique_recipe_capabilities = set(item['IRI'] for item in recipe_capabilities)
        
        # Check if all IDs in recipe are in aasx
        if len(found_capabilities)>0:
            string=""
            for capability in found_capabilities:
              string = string + capability + "\r\n"
            print(string)
            return make_response(string, 200)
        else:
            string = "There are no Capability IRIS in Recipe that can be realized by an given AAS." 
            print(string)        
            return make_response(string, 200)

    app.register_blueprint(ontology_api)
    app.register_blueprint(recipe_api)
    app.register_blueprint(aas_api)
    return app








# debug is for testing to make this production ready read:
# https://zhangtemplar.github.io/flask/
if __name__ == '__main__':
    app = create_app()
    swagger = Swagger(app)
    #serve(app, host='0.0.0.0', port=8080) #this starts the production server
    app.run(debug=True) #this starts the development server
