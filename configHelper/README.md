# CI Config Helper
A configuration utility for populating elements of a Jenkins Configuration as Code yaml from other sources such as AWS Secrets Manager

## Development

To install pipenv:
```shell
pip install pipenv --user
```

To use this tool:

```shell
pipenv install
pipenv run python3 config_helper.py --jenkins-config-file-path=/initial_jenkins.yaml --auth-secret-arn=<SECRET_ARN> --security-realm-id=oic --aws-region=<REGION_NAME>
```

### Unit Tests

Unit tests can be run from this current `configHelper/` directory by first installing dependencies then running pytest:

```shell
pipenv install --dev
pipenv run test
```