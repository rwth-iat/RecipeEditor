from flask import Blueprint, current_app, jsonify, request, send_from_directory
import mimetypes

from ontologyService import (
    delete_ontology,
    OntologyServiceError,
    format_error_payload,
    get_category_directory,
    get_ontology_class_tree,
    get_ontology_classes,
    get_ontology_subclasses,
    list_ontologies,
    resolve_ontology_path,
    upload_ontology,
)


mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


ontology_api = Blueprint("ontology_api", __name__)


def build_error_response(exc: OntologyServiceError):
    return jsonify(format_error_payload(exc)), exc.status_code


@ontology_api.route("/onto/<category>", methods=["POST"])
def upload_onto(category):
    try:
        result = upload_ontology(
            request.files.get("file"),
            category,
            current_app.config,
        )
    except OntologyServiceError as exc:
        return build_error_response(exc)

    return jsonify({
        "message": "Ontology uploaded successfully.",
        "filename": result.filename,
        "category": result.category,
        "detectedFormat": result.detected_format,
        "canonicalFormat": result.canonical_format,
    }), 201


@ontology_api.route("/onto/<category>", methods=["GET"])
def get_onto(category):
    try:
        ontologies = list_ontologies(current_app.config, category, current_app.logger)
    except OntologyServiceError as exc:
        return build_error_response(exc)
    return jsonify(ontologies)


@ontology_api.route("/onto/<category>/<filename>/classes", methods=["GET"])
def get_classes(category, filename):
    try:
        classes = get_ontology_classes(current_app.config, category, filename)
    except OntologyServiceError as exc:
        return build_error_response(exc)
    return jsonify(classes)


@ontology_api.route("/onto/<category>/<filename>/class-tree", methods=["GET"])
def get_class_tree(category, filename):
    try:
        class_tree = get_ontology_class_tree(current_app.config, category, filename)
    except OntologyServiceError as exc:
        return build_error_response(exc)
    return jsonify(class_tree)


@ontology_api.route("/onto/<category>/<filename>/subclasses", methods=["GET"])
def get_subclasses_by_iri(category, filename):
    try:
        subclasses = get_ontology_subclasses(
            current_app.config,
            category,
            filename,
            class_iri=request.args.get("classIri"),
        )
    except OntologyServiceError as exc:
        return build_error_response(exc)
    return jsonify(subclasses)


@ontology_api.route("/onto/<category>/<filename>/<super_class>/subclasses", methods=["GET"])
def get_subclasses(category, filename, super_class):
    try:
        subclasses = get_ontology_subclasses(
            current_app.config,
            category,
            filename,
            class_name=super_class,
        )
    except OntologyServiceError as exc:
        return build_error_response(exc)
    return jsonify(subclasses)


@ontology_api.route("/onto/<category>/<filename>", methods=["GET"])
def download_onto(category, filename):
    try:
        ontology_path = resolve_ontology_path(current_app.config, category, filename)
    except OntologyServiceError as exc:
        return build_error_response(exc)

    response = send_from_directory(get_category_directory(current_app.config, category), ontology_path.name)
    mimetype, _ = mimetypes.guess_type(ontology_path.name)
    if mimetype:
        response.headers["Content-Type"] = mimetype
    return response


@ontology_api.route("/onto/<category>/<filename>", methods=["DELETE"])
def delete_onto(category, filename):
    try:
        deleted_path = delete_ontology(current_app.config, category, filename)
    except OntologyServiceError as exc:
        return build_error_response(exc)

    return jsonify({
        "message": "Ontology deleted successfully.",
        "filename": deleted_path.name,
        "category": category,
    })
