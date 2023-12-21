// kvm-test.js
// ------------------------------------------------------------------
//
// created: Fri Dec 15 10:35:37 2023
// last saved: <2023-December-21 08:00:15>

/* jshint esversion:9, node:true, strict:implied */
/* global process, console, Buffer */

import fetch from "node-fetch";
import path from "path";
import { parseArgs } from "node:util";
import { execSync } from "child_process";

let verbose = false;

const getGcpAccessToken = (getTokenFromComuteMetadata) => {
  if (!getTokenFromComuteMetadata) {
    const cmd = "gcloud auth print-access-token";
    if (verbose) {
      console.log(`executing '${cmd}'`);
    }
    const access_token = execSync(cmd, {
      encoding: "utf-8"
    }).trim();
    const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`,
      method = "GET",
      headers = {},
      body = null;
    if (verbose) {
      console.log(`${method} ${url}`);
    }

    return fetch(url, { method, headers, body })
      .then(async (res) => [res.status, await res.json()])
      .then(([status, _payload]) => {
        if (status != 200) {
          return Promise.reject(new Error("minted access_token is not valid"));
        }
        return Promise.resolve({ access_token });
      });
  }

  const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`,
    method = "GET",
    headers = { "Metadata-Flavor": "Google" },
    body = null;

  if (verbose) {
    console.log(`${method} ${url}`);
  }
  return fetch(url, { method, headers, body })
    .then(async (res) => [res.status, await res.json()])
    .then(([status, payload]) => {
      if (status != 200) {
        return Promise.reject(
          new Error(`cannot retrieve access_token (status: ${status})`)
        );
      }
      return payload;
    });
};

const upsertKvmEntry = async ({
  org,
  env,
  kvm,
  entryname,
  entryvalue,
  cloudtoken
}) => {
  const tokenPayload = await getGcpAccessToken(cloudtoken);

  const collectionUrl = `https://apigee.googleapis.com/v1/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries`,
    entryUrl = `${collectionUrl}/${entryname}`,
    headers = {
      Authorization: `Bearer ${tokenPayload.access_token}`
    };

  // inquire
  let method = "GET",
    body = null;

  if (verbose) {
    console.log(`${method} ${entryUrl}`);
  }
  let response = await fetch(entryUrl, { method, headers, body });

  if (response.status != 200 && response.status != 404) {
    // Possible reasons:
    // - KVM Mapname is incorrect,
    // - lack of access,
    // - environment is incorrect,
    // - ...
    return new Error(`cannot inquire KVM (status: ${response.status})`);
  }

  // 200 = it exists
  // 404 = it does not exist
  let data = await response.json();

  const needDelete = response.status == 200 && data.value != entryvalue;
  const needInsert = response.status == 404 || needDelete;
  if (!needInsert) {
    return data;
  }

  // First, conditionally delete the entry.
  if (needDelete) {
    method = "DELETE";
    if (verbose) {
      console.log(`${method} ${entryUrl}`);
    }
    response = await fetch(entryUrl, { method, headers, body });
    if (response.status != 200) {
      return new Error(
        `cannot delete existing KVM entry (status: ${response.status})`
      );
    }
  }

  // Now, insert the entry
  method = "POST";
  headers["content-type"] = "application/json";
  body = JSON.stringify({
    name: entryname,
    value: entryvalue
  });
  if (verbose) {
    console.log(`${method} ${collectionUrl}`);
  }
  response = await fetch(collectionUrl, { method, headers, body });
  if (response.status != 201) {
    return new Error(
      `cannot insert new KVM entry (status: ${response.status})`
    );
  }
  data = await response.json();
  return data;
};

// ====================================================================
const options = {
  org: {
    type: "string",
    short: "o",
    required: true,
    help: "the Apigee organization"
  },
  env: {
    type: "string",
    short: "e",
    required: true,
    help: "the Apigee environment"
  },
  kvm: {
    type: "string",
    short: "k",
    required: true,
    help: "the name of the Apigee environment-scoped KeyValueMap to update"
  },
  entryname: {
    type: "string",
    short: "n",
    required: true,
    help: "the name of the entry within the KeyValueMap to update"
  },
  entryvalue: {
    type: "string",
    short: "v",
    required: true,
    help: "the value of the KeyValueMap entry to apply"
  },
  cloudtoken: {
    type: "boolean",
    short: "C",
    required: false,
    help: "whether to use the metadata.google.internal endpoint to get a token. Default: use `gcloud auth print-access-token`"
  },
  verbose: {
    type: "boolean",
    short: "V",
    required: false,
    help: "verbose mode"
  },
  help: {
    type: "boolean",
    short: "h",
    required: false,
    help: "print this message"
  }
};

const printHelp = () => {
  const helptext = Object.keys(options)
    .map((name) => {
      const basetext =
        options[name].type == "boolean"
          ? `--${name}, -${options[name].short}`
          : `--${name} ARG, -${options[name].short} ARG`;
      return `  ${basetext} : ${options[name].help}`;
    })
    .join("\n");
  const scriptname = process.argv[1].split(path.sep).slice(-1);
  console.log(`\n${scriptname}: Upsert into an Apigee KVM\n`);
  console.log(`Options:`);
  console.log(helptext + "\n");
};

const { values } = parseArgs({ options });

if (values.help) {
  printHelp();
} else {
  verbose = values.verbose;
  const missing = Object.keys(options).filter(
    (name) => options[name].required && !(name in values)
  );
  if (missing.length) {
    const msg = missing.map((e) => `--${e}`).join(", ");
    printHelp();
    throw new Error(`missing arguments: ${msg}`);
  }

  const data = await upsertKvmEntry(values);
  console.log(data);
}
