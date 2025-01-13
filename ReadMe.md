# general info
This is the Project of my Master Thesis. It is a Grpahicl Editor for General Recipes in the BatchML standard.

These Badges show the Test results of the current Code.

[![Server Test](https://github.com/ReggaeUlli/Masterarbeit-code/actions/workflows/server-test.yml/badge.svg)](https://github.com/ReggaeUlli/Masterarbeit-code/actions/workflows/server-test.yml) [![Client Test](https://github.com/ReggaeUlli/Masterarbeit-code/actions/workflows/client-test.yml/badge.svg)](https://github.com/ReggaeUlli/Masterarbeit-code/actions/workflows/client-test.yml)

## Running the Server
To run the server Python (3.10 at best) needs to be installed.
The following lines make sure you are in the "server" subfolder, install needed python packages using pip and runs the app:

  ```
  cd server
  pip install -r requirements.txt
  python app.py
  ```

After that the server is running under:
- http://127.0.0.1:5000/apidocs for the documentation
- http://127.0.0.1:5000/editor for the GUI.

# Functionality
## already implemented Features
- [X] upload ontologies
- [X] load ontology classes as processes
- [X] drag & drop processes and materials into workspace
- [X] move processes and materials in workspace
- [X] connect elements via drag and drop
- [X] double click on element to edit properties
- [X] zoom in and out via zoom buttons
- [X] panning of the workspace (moving horizontally and vertically)
- [X] generate simple BatchML (needs to be extended)
- [X] validate BatchML
- [X] automated testing pipeline with every project push (tests need to be extended)
- [X] delete elements
- [X] open macro steps in new workspace
- [X] add Ressource Constraints
- [X] add parallel process logic
- [X] change element styles to oficial Chart elements
- [X] add creation of macro Steps

## under development 
- [ ] add macro processParameters (only simple ones possible yet)
- [ ] add possibillity to save current workspace
- [ ] multiple workspace tabs (one for main process, others for opened subprocesses)
- [ ] extend generated BatchML
- [ ] Capability Matching

## Outlook
- [ ] extend capability matching
- [ ] extend BatchML creation
- [ ] import material library
- [ ] import BatchML into workspace

# Structure
As a complex Ui is needed for the Editor, a Javascript Framework is recommended to handle the complexity.
Vue.js was chosen as it is one of the most used Frameworks and recommended for solo Programming, while other frameworks have benefits in Enterprise setting.

Therefore the Project will be build on those two main technologies. This is also displayed in the folder structure:
- client/
  - contains the frontend code
  - is a Vue.js Project
  - contains the logic for the Graphical Editor
- server/
  - contains the backend code
  - uses Python + Flask
  - servers the Editor to the user, manages the ontologies, etc. ...

# Building the project
After changing the client code, a new Build is necessary for the changes to effect in the server. All steps necessary to Build and start the project are combined in one Batch File. Make sure you are in the root folder of the project and run:
  - `./build_run.bat`

The commands in the build file are explained in the following and can also be run one by one manualy:
- To build the Client part:
  - npm must be installed
  - change directory to clinet folder, make sure all packages are installed and build the package:
    ```
    cd client
    npm install
    npm run build
    ```

- Building the Client part automatically puts the new Client-Files into the servers static folder. Therefore by starting the Python server the new client is served.
  - make sure you are in the right folder (server) and run the app.py script:
    ```
    cd server
    pip install -r requirements.txt
    python server.py
    ```

# Notes for developers
- After Making changes to the Client code, the project needs to be rebuild in order for the changes to arrive in the python server. Therefore after Changes you at least need to run `npm build` in the client folder and afterwards restart the python server. Therefore after changes you can simply run the batch file which will rebuild and start the server for you. to run the batch file run `./build_run.bat` in the root folder.
- As the build takes quite a bit of time, when simply developing the client code which does not need the functionality of the python server api, running `npm run dev` in the client folder. This runs a development server at "http://localhost:5173". This starts up much faster and allows for the browser integrated debuggers to work. Also every change in code is directly used in the browser after saving the file with ctrl+s (hotfix)

# Troubleshooting while installing
If you run into problems trying to install/build the project you may look into the github acitons. As the automated tests run successfully, installing the same environment as them should definetly also work. So try to use the same Pyhton/nodejs version and install the dependencies the same way.

For example the NodeJs Version used is: 18.17.1
The Python version used is: 3.10

If you are still facing problems, you can look further into it in the actions, trying to use the same pip version etc.
