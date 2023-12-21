# Apigee KVM Upsert Example

This repository is a nodejs script that "upserts" a single entry into the
Apigee Key Value Map.

## License

This material is Copyright 2023 Google LLC and is licensed under the [Apache 2.0
License](LICENSE). This includes the the API Proxy configuration as well as the
nodejs programs and libraries.

## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.
If you have questions on using it, please ask via github or on [The Apigee community forum](https://www.googlecloudcommunity.com/gc/Apigee/bd-p/cloud-apigee) .


## How it works

The Apigee API now includes operations for
[Creating](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/create),
[listing](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/list),
[deleting](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/delete),
and
[getting](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/get)
KVM entries.  Notably, there is no primitive for "insert the entry if it does not exist, or update the entry if it exists". Aka [Upsert](https://www.google.com/search?q=upsert).

Therefore to get "upsert" behavior, which implies either insert or update,
depending on whether there is an existing entry, you can use a sequence like
this:

1. query the target entry
2. if the target entry does not exist, insert the entry with the desired value, and quit.
3. if the existing value is different than the desired value, delete it and insert the entry with the desired value.


# Try it yourself

You can try this yourself.

Pre-requisites:
- a GCP project with Apigee configured on it.
- an Apigee environment-scoped KeyValueMap
- node v18 or above

## Install node modules

```sh
npm install
```

## Run it

```sh
KVM_MAP_NAME=whatever
node ./apigee-kvm-upsert.js --org $ORG --env $ENV --kvm ${KVM_MAP_NAME} -n entry-X -v value-X -d
```

## Help
```
apigee-kvm-upsert.js: Upsert into an Apigee KVM

Options:
  --org ARG, -o ARG : the Apigee organization
  --env ARG, -e ARG : the Apigee environment
  --kvm ARG, -k ARG : the name of the Apigee environment-scoped KeyValueMap to update
  --entryname ARG, -n ARG : the name of the entry within the KeyValueMap to update
  --entryvalue ARG, -v ARG : the value of the KeyValueMap entry to apply
  --cloudtoken, -C : whether to use the metadata.google.internal endpoint to get a token. Default: use `gcloud auth print-access-token`
  --verbose, -V : verbose mode
  --help, -h : print this message
```
