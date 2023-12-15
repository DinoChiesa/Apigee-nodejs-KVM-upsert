# Apigee KVM Upsert Example

This repository is a nodejs script that "upserts" a single entry into the
Apigee Key Value Map.

## License

This material is Copyright 2023 Google LLC and is licensed under the [Apache 2.0
License](LICENSE). This includes the the API Proxy configuration as well as the
nodejs programs and libraries.

## Disclaimer

This example is not an official Google product, nor is it part of an official Google product.
If you have questions on using it, please ask  via github or community.apigee.com .


## How it works

The Apigee API now includes operations for
[Creating](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/create),
[listing](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/list),
[deleting](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/delete),
and
[getting](https://cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.keyvaluemaps.entries/get)
KVM entries.  Notably, there is no "Update entry". Therefore, when updating a
value, you need to first delete the existing entry, then insert the new entry
value.

Therefore to get "upsert" behavior, which implies either insert or update,
depending on whether there is an existing entry, you can use a sequence like
this:

1. read the entries
2. if there is an existing entry of the desired name, delete it
3. insert the entry with the desired name


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
