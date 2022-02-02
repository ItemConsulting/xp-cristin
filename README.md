# Cristin integration for XP

This library schedules tasks every night at 01:00, that reads from  the [Cristin APIs](https://api.cristin.no/v2/doc/index.html)
and creates or updates data for an organization in custom repos.

The shape is not changed from the original ones in Cristin.

The follow repos are created:
 - `"no.item.cristin.persons"`
 - `"no.item.cristin.projects"`
 - `"no.item.cristin.results"`

## Configuration

The application need the file: **XP_HOME/config/no.item.cristin.cfg** to exist. This is where you configure 
which *institution* the data should be imported for.

```ini
institution=<my-institution-number>
```

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
