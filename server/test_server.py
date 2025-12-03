from server import create_app
import pytest
import json
from pathlib import Path


# is run before the tests
# creates an instance of the webserver
@pytest.fixture
def app():
    app = create_app()
    print(app.url_map)
    return app


# is run before the tests
# creates a flask test client based on the webserver
@pytest.fixture
def client(app):
    return app.test_client()


def test_editor(client):
    response = client.get('/editor')
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
    response = client.get('/editor')
    assert response.status_code == 200
    # Add more test assertions as needed


'''
def test_post_onto(client):
    response = client.post('/onto')
    assert response.status_code == 200
    # Add more test assertions as needed
'''


def test_get_specific_onto(client):
    response = client.get('/onto/OntoProCap.owl')
    assert response.status_code == 200
    # Add more test assertions as needed


def test_get_onto_classes(client):
    response = client.get('/onto/OntoProCap.owl/classes')
    assert response.status_code == 200
    
    # # check if the real classes are correctly returned
    # response_obj = json.loads(response.text)
    # wanted_response = ["Absorbing","Combining","Separating","Gas","Liquid","Solid","Acoustic_gas_cleaning","Briquetting","Actuator","Component","Adsorbing","Agglomerating","OperationChangingMaterial","Agitator","Stirring","AnalogValve","Valve","On/OffValve","Atomizing","Dosing","BarrelPump","Pump","Beading","Dividing","Detach","BranchL","ControlledValve","Branching","ProcessSpecificCapability","CapabilityConstraint","CentrifugalPump","Centrifuging","Store","Changing_the_enthalpy","PressureAdjustment","Tempering","Circulation","GeneralCapabilityEffecting","Compacting","Resource","Condenser","HeatExchanger","Cooling","Heater","Condensing","Container","ControlledConatiner","FEA","ControlledHeater","ControlledPump","ControlledReactor","Heating","Cooling_of_gases","Cooling_of_liquids","Cooling_of_solids","Crushing","Crystallising","Cutting","Cycloning","Decanting","Defibering","DensityMeasuring","GeneralCapabilityMeasuring","Density_sorting","DepthConstraint","Desorbing","Dialysing","Dispersion_granulating","Dissolving","Distilling","DosierPump","DosingFlow","DosingVolumen","Draining","Drying","Electric-magnetic_Crushing","ElectricalField","Electrical_gas_cleaning","Electro-osmosis","Electro_sorting","Electrodialysing","Electrophoretising","Emulsifying","Energy","Form","Evaporating","Exsorbing","Extracting","FBranchL","FlowSensor","FPumpL","Filtering","Filtration","Flaking","Floating","FlowConstraint","FlowMeasuring","FlowPumpThing","Sensor","FlowStoping","Foam_braking","Foam_creating","Foaming","ForceMeasuring","ProductObjectMaterial","Formless","Freeze","FrequencyMeasuring","Fusing","Gas_centrifuging","Gas_washing","GeneralCapability","Given_geometric_shape","Grease_adhesion_sorting","Grinding","Heating_of_gases","Heating_of_liquids","Heating_of_solids","HumidityMeasuring","Hydroclassifying","Hydrocycloning","Impact_separating","Impact_sorting","Kneading","LAgitatorL","LevelSensor","LContainerL","LPumpL","LTAgitatorL","TemperatureSensor","LTHeaterL","LengthConstraint","LevelMeasuring","Magnetically_separating","Melting","Milling","Mixing","Mixing_of_Gases","Mixing_of_Liquids","Moistening_of_Gases","PHMeasuring","PHSensor","Picking","Pipeline","PressureConstraint","PressureMeasuring","PressureSensor","Pumping","Quenching_Granulating","Rasp","Rectifying","Refining","Roll_granulating","RotationConstraint","Rubbing","Sedimenting","Segregating","Separation_diffusion","Sieving","Sifting","Sintering","Smoothing","Soaking","Solidifying","Solubility_displacing","SpeedMeasuring","Spraying","Squeezing","Sublimating","Suspending","Swelling","TAgitatorL","TemperatureMeasuring","THeaterL","Tabletting","TemperaturConstraint","Thermal_Shredding","Thermal_sorting","Vaporating","Vaporize","Volatilizing","VolomenConstraint","VolumenPumpThing","WeightMeasuring","Zone_melting","SystemCapability"]
    # assert response_obj == wanted_response


# def test_get_onto_subclasses(client):
#     response = client.get('/onto/OntoProCap.owl/Combining/subclasses')
#     assert response.status_code == 200

#     # check if correct subclasses are returned
#     response_obj = json.loads(response.text)
    
#     wanted_response = [{"name":"Combining","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Combining","dataType":"uriReference","key":"Capability_with_Query.Combining"}]}],"children":[{"name":"Absorbing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Absorbing","dataType":"uriReference","key":"Capability_with_Query.Absorbing"}]}],"children":[]},{"name":"Adsorbing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Adsorbing","dataType":"uriReference","key":"Capability_with_Query.Adsorbing"}]}],"children":[]},{"name":"Atomizing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Atomizing","dataType":"uriReference","key":"Capability_with_Query.Atomizing"}]}],"children":[]},{"name":"Dissolving","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Dissolving","dataType":"uriReference","key":"Capability_with_Query.Dissolving"}]}],"children":[]},{"name":"Emulsifying","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Emulsifying","dataType":"uriReference","key":"Capability_with_Query.Emulsifying"}]}],"children":[]},{"name":"Foam_creating","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Foam_creating","dataType":"uriReference","key":"Capability_with_Query.Foam_creating"}]}],"children":[]},{"name":"Fusing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Fusing","dataType":"uriReference","key":"Capability_with_Query.Fusing"}]}],"children":[]},{"name":"Kneading","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Kneading","dataType":"uriReference","key":"Capability_with_Query.Kneading"}]}],"children":[]},{"name":"Mixing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Mixing","dataType":"uriReference","key":"Capability_with_Query.Mixing"}]}],"children":[]},{"name":"Mixing_of_Gases","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Mixing_of_Gases","dataType":"uriReference","key":"Capability_with_Query.Mixing_of_Gases"}]}],"children":[]},{"name":"Mixing_of_Liquids","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Mixing_of_Liquids","dataType":"uriReference","key":"Capability_with_Query.Mixing_of_Liquids"}]}],"children":[]},{"name":"Moistening_of_Gases","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Moistening_of_Gases","dataType":"uriReference","key":"Capability_with_Query.Moistening_of_Gases"}]}],"children":[]},{"name":"Rubbing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Rubbing","dataType":"uriReference","key":"Capability_with_Query.Rubbing"}]}],"children":[]},{"name":"Smoothing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Smoothing","dataType":"uriReference","key":"Capability_with_Query.Smoothing"}]}],"children":[]},{"name":"Soaking","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Soaking","dataType":"uriReference","key":"Capability_with_Query.Soaking"}]}],"children":[]},{"name":"Spraying","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Spraying","dataType":"uriReference","key":"Capability_with_Query.Spraying"}]}],"children":[]},{"name":"Suspending","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Suspending","dataType":"uriReference","key":"Capability_with_Query.Suspending"}]}],"children":[]},{"name":"Swelling","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Swelling","dataType":"uriReference","key":"Capability_with_Query.Swelling"}]}],"children":[]},{"name":"Volatilizing","otherInformation":[{"otherInfoID":"SemanticDescription","description":["URI referencing the Ontology Class definition"],"otherValue":[{"valueString":"http://www.acplt.de/Capability#Volatilizing","dataType":"uriReference","key":"Capability_with_Query.Volatilizing"}]}],"children":[]}]}]
#     assert response_obj == wanted_response

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