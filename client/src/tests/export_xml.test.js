import { generate_batchml } from "@/services/recipeExport/new_export_xml.js"; // Adjust the path as needed
import { expect, test } from "vitest";
import * as fs from 'fs'

test("Generate Basic BatchML", async () => {
    let workspace_items = [{
        id: "lmorr3zsv6wxnsippj",
        description: "Draining",
        name: "Draining",
        otherInformation: [{"otherInfoID":"testOtherInfoID","description":["testDescription"],"otherValue":[{"valueString":"test value string","key":"testkey"}]}],
        sourceEndpoint: {},
        targetEndpoint: {},
        amount: {},
        type: "process",
        x: 300,
        y: 400
    }]
    let jsplumb_connections = []
    let generatedXmlString = generate_batchml(workspace_items, jsplumb_connections)
    
    //Define Expected XML
    let expectedXmlString = fs.readFileSync("./src/tests/expectedXml.xml", 'utf8')

    //remove line breaks from generated and expected string to avoid differences of operating system etc:
    expectedXmlString = expectedXmlString.replace(/(\r\n|\n|\r)/gm, "");
    generatedXmlString = generatedXmlString.replace(/(\r\n|\n|\r)/gm, "");

    //Assertion
    expect(generatedXmlString).toBe(expectedXmlString);
 });