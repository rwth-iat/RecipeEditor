import { MasterRequestStatus, XmlValidationStatus } from "../types/exportTypes";

function resolveHttpStatus(error) {
  return error?.response?.status || error?.request?.status || null;
}

export async function validateGeneralRecipeXmlRequest({ client, xml }) {
  try {
    const response = await client.get("/grecipe/validate", {
      params: { xml_string: xml },
    });

    if (response.status === 200) {
      return {
        status: XmlValidationStatus.VALID,
        message: "General Recipe XML is valid.",
        details: null,
      };
    }

    return {
      status: XmlValidationStatus.ERROR,
      message: "Unexpected response while validating General Recipe XML.",
      details: response,
    };
  } catch (error) {
    const status = resolveHttpStatus(error);
    if (status === 400) {
      return {
        status: XmlValidationStatus.INVALID,
        message: "General Recipe XML is invalid.",
        details: error?.response?.data ?? null,
      };
    }
    if (status === 404) {
      return {
        status: XmlValidationStatus.UNREACHABLE,
        message: "Validation endpoint for General Recipe is unreachable.",
        details: error,
      };
    }
    return {
      status: XmlValidationStatus.ERROR,
      message: "General Recipe XML validation failed.",
      details: error,
    };
  }
}

export async function validateMaterialInformationXmlRequest({ client, xml }) {
  try {
    const response = await client.get("/material/validate", {
      params: { xml_string: xml },
    });

    if (response.status === 200) {
      return {
        status: XmlValidationStatus.VALID,
        message: "MaterialInformation XML is valid.",
        details: null,
      };
    }

    return {
      status: XmlValidationStatus.ERROR,
      message: "Unexpected response while validating MaterialInformation XML.",
      details: response,
    };
  } catch (error) {
    const status = resolveHttpStatus(error);
    if (status === 400) {
      return {
        status: XmlValidationStatus.INVALID,
        message: "MaterialInformation XML is invalid.",
        details: error?.response?.data ?? null,
      };
    }
    if (status === 404) {
      return {
        status: XmlValidationStatus.UNREACHABLE,
        message: "Validation endpoint for MaterialInformation is unreachable.",
        details: error,
      };
    }
    return {
      status: XmlValidationStatus.ERROR,
      message: "MaterialInformation XML validation failed.",
      details: error,
    };
  }
}

export async function requestMasterRecipeXmlRequest({ client, payload }) {
  try {
    const response = await client.post("/api/recipe/master", payload);
    if (response.status === 200) {
      return {
        status: MasterRequestStatus.VALID,
        xml: response.data,
        validationError: null,
        details: null,
      };
    }
    return {
      status: MasterRequestStatus.ERROR,
      xml: null,
      validationError: "Unexpected response while creating master recipe.",
      details: response,
    };
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        return {
          status: MasterRequestStatus.INVALID,
          xml:
            typeof error.response.data === "string" &&
            error.response.data.includes("<?xml")
              ? error.response.data
              : null,
          validationError:
            error.response.headers?.["x-validation-error"] ||
            (typeof error.response.data === "string"
              ? error.response.data
              : JSON.stringify(error.response.data ?? {}, null, 2)),
          details: error,
        };
      }
      if (error.response.status === 500) {
        return {
          status: MasterRequestStatus.SERVER_ERROR,
          xml: null,
          validationError:
            typeof error.response.data === "string"
              ? error.response.data
              : "Internal server error while creating master recipe.",
          details: error,
        };
      }
      return {
        status: MasterRequestStatus.ERROR,
        xml: null,
        validationError: `HTTP ${error.response.status}`,
        details: error,
      };
    }
    if (error.request) {
      return {
        status: MasterRequestStatus.NETWORK_ERROR,
        xml: null,
        validationError: "Unable to reach server.",
        details: error,
      };
    }
    return {
      status: MasterRequestStatus.ERROR,
      xml: null,
      validationError: error?.message || "Unknown master recipe error.",
      details: error,
    };
  }
}
