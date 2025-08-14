from werkzeug.utils import secure_filename
from flask import flash, make_response
import os
import owlready2

UPLOAD_FOLDER = './upload/'

ALLOWED_EXTENSIONS = {'owl', 'aasx', 'xml', 'mtp', 'aml'}

def upload_file(request, subfolder):
  print("upload startet")
  # check if the post request has the file part
  if 'file' not in request.files:
      print("no file given")
      flash('No file part')
      # return redirect(request.url)
      return make_response(request.url, 400)
  file = request.files['file']
  # If the user does not select a file, the browser submits an
  # empty file without a filename.
  if file.filename == '':
      print("filename is empty string")
      flash('No selected file')
      # return redirect(request.url)
      return make_response(request.url, 400)
  if file and allowed_file(file.filename):
      print("file allowed")
      filename = secure_filename(file.filename)
      filepath = os.path.join(UPLOAD_FOLDER, subfolder, filename)
      file.save(filepath)

      # add to ontologies dict
      onto = owlready2.get_ontology(filepath).load()
      # return redirect(url_for('download_file', name=filename))
      return make_response(request.url, 200)
  print("file not allowed")
  make_response("file not allowed or no post request")
  return make_response(request.url, 400)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS