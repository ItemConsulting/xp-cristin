# Cristin application for XP

[Cristin](https://www.cristin.no) is a service that gathers and makes available information about Norwegian research.

This application integrates with the [Cristin APIs](https://api.cristin.no/v2/doc/index.html), to make it easy to create
a relation between data in Cristin with content in XP.

 > **Note** You can use [lib-xp-cristin](https://github.com/ItemConsulting/lib-xp-cristin) in your application to 
 > interact with data from Cristin in **your** application.
 
[![](https://jitpack.io/v/no.item/xp-cristin.svg)](https://jitpack.io/#no.item/xp-cristin)

<img src="https://github.com/ItemConsulting/xp-cristin/raw/main/docs/icon.svg?sanitize=true" width="150">

## Configuring your organization

This application is intended to cache data for **one organization**, which is specified in *no.item.cristin.cfg*.

 > **Warning** You need a config file **XP_HOME/config/no.item.cristin.cfg** with this configuration:
 > ```ini
 > institution=<my-institution-number>
 > ```


## Using local copies of the Cristin data

We want to display data from Cristin on our XP site, and to make it quick, searchable and robust copies of data from the
API is stored in local [repos (Elastic Search Databases)](https://developer.enonic.com/docs/xp/stable/api/lib-repo) in XP.

Upon installation of this application – and then on a nightly schedule – data from Cristin is copied into the local repositories

The follow repos are created:
- `"no.item.cristin.persons"`
- `"no.item.cristin.institutions"`
- `"no.item.cristin.projects"`
- `"no.item.cristin.units"`
- `"no.item.cristin.results"`
- `"no.item.cristin.resultcontributors"`

## Creating a relation between Cristin data and XP Content

This application exposes four services that you can use with [Custom Selectors](https://developer.enonic.com/docs/xp/stable/cms/input-types#customselector) to associate Cristin Ids with your XP Content.

 > **Note** For most of these services you can pass the Cristin ID of your `institution` as a parameter to filter.
 > ```xml
 > <param value="institution">[my-institution-number]</param>
 > ``` 

### Person

Use the `no.item.cristin:person` CustomSelector-service to select a researcher from Cristin, and store their CristinID on the Content.

```xml
<input name="cristinProfileId" type="CustomSelector">
  <label>Profile from Cristin</label>
  <occurrences minimum="0" maximum="1"/>
  <config>
    <service>no.item.cristin:person</service>
    <param value="institution">186</param>
  </config>
</input>
```

### Project
Use the `no.item.cristin:project` CustomSelector-service to get the CristinID of a Project.

```xml
<input name="cristinProjectId" type="CustomSelector">
  <label>Project from Cristin</label>
  <occurrences minimum="0" maximum="1"/>
  <config>
    <service>no.item.cristin:project</service>
    <param value="institution">186</param>
  </config>
</input>
```

### Result

Use the `no.item.cristin:result` CustomSelector-service to get the CristinID of a Result.

```xml
<input name="cristinResultId" type="CustomSelector">
  <label>Publications from Cristin</label>
  <occurrences minimum="0" maximum="0"/>
  <config>
    <service>no.item.cristin:result</service>
    <param value="institution">186</param>
  </config>
</input>
```

### Result Category

This CustomSelector-service can be used to create a filter in a part that returns which categories of Results should be displayed on the page.

```xml
<input name="cristinCategories" type="CustomSelector">
  <label>Publication categories</label>
  <help-text>Select the categories you want to appear in the list</help-text>
  <occurrences minimum="0" maximum="0"/>
  <config>
    <service>no.item.cristin:result-category</service>
  </config>
</input>
```

## What do I use all these Cristin IDs for?

You can use [lib-xp-cristin](https://github.com/ItemConsulting/lib-xp-cristin) in your application to fetch the data 
related to the Cristin IDs.

*Example usage of `getCristinPerson()` in an XP service (in TypeScript):*

```typescript
import { get as getOne } from "/lib/xp/content";
import { getCristinPerson } from "/lib/cristin";
import type { Employee } from "../../content-types"; 

export function get(req: XP.Request): XP.Response {
  const employee = getOne<Employee>({
    key: req.params.id!
  });

  if (employee) {
    const cristinPerson = getCristinPerson(employee.data.cristinProfileId);
    
    return {
      status: 200,
      body: {
        employee,
        cristinPerson
      }
    }
  } else {
    return {
      status: 404
    }
  }
}
```

The `getCristinPerson()` function does the following:
 1. Check if the data for the researcher (employee) is found in the local repo
 2. If not, fetch it from the Cristin API and save it to the repo
 3. Return the data (or `void` if it doesn't exist)

## Development

### Generating TypeScript-types for Cristin

[JSON-Schemas from the Cristin APIs](https://api.cristin.no/v2/doc/json-schemas/) are downloaded and placed in the **resources/schemas**-directory.
They are used to generate TypeScript-types in the **resources/types**-directory, by running the following script:

```bash
npm run json2ts
```

## Deploying

### Building

To build he project run the following code

```bash
enonic project build
```

### Deploy locally

Deploy locally for testing purposes:

```bash
enonic project deploy
```

## Deploy to Jitpack

Go to the [Jitpack page for xp-cristin](https://jitpack.io/#no.item/xp-cristin) to deploy from Github.
