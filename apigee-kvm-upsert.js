// kvm-test.js
// ------------------------------------------------------------------
//
// created: Fri Dec 15 10:35:37 2023
// last saved: <2023-December-15 11:49:56>

/* jshint esversion:9, node:true, strict:implied */
/* global process, console, Buffer */

import fetch from "node-fetch";
import { parseArgs } from "node:util";
import { execSync } from "child_process";
import os from "os";

const getGcpAccessToken = (runningOutsideOfGoogleCloud) => {
  if (runningOutsideOfGoogleCloud) {
    const access_token = execSync("gcloud auth print-access-token", {
      encoding: "utf-8"
    }).trim();
    const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`,
      method = "GET",
      headers = {},
      body = null;

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
  dev
}) => {
  const tokenPayload = await getGcpAccessToken(dev);

  const url = `https://apigee.googleapis.com/v1/organizations/${org}/environments/${env}/keyvaluemaps/${kvm}/entries`,
    headers = {
      Authorization: `Bearer ${tokenPayload.access_token}`
    };

  // inquire
  let method = "GET",
    body = null,
    response = await fetch(url, { method, headers, body });

  if (response.status != 200) {
    return new Error(`cannot inquire KVM (status: ${response.status})`);
  }

  let data = await response.json();
  if (data.keyValueEntries.find((entry) => entry.name == entryname)) {
    // must delete first
    const url2 = `${url}/${entryname}`;
    method = "DELETE";
    response = await fetch(url2, { method, headers, body });
    if (response.status != 200) {
      return new Error(
        `cannot delete existing KVM entry (status: ${response.status})`
      );
    }
    //console.log(await response.text());
  }

  // now insert
  method = "POST";
  headers["content-type"] = "application/json";
  body = JSON.stringify({
    name: entryname,
    value: entryvalue
  });
  response = await fetch(url, { method, headers, body });
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
    required: true
  },
  env: {
    type: "string",
    short: "e",
    required: true
  },
  kvm: {
    type: "string",
    short: "k",
    required: true
  },
  entryname: {
    type: "string",
    short: "n",
    required: true
  },
  entryvalue: {
    type: "string",
    short: "v",
    required: true
  },
  dev: {
    type: "boolean",
    short: "d",
    required: false
  }
};

const { values } = parseArgs({ options });

const missing = Object.keys(options).filter(
  (name) => options[name].required && !(name in values)
);
if (missing.length) {
  const msg = missing.map((e) => `--${e}`).join(", ");
  throw new Error(`missing arguments: ${msg}`);
}

const data = await upsertKvmEntry(values);

console.log(data);
