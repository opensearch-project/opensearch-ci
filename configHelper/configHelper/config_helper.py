import argparse
import boto3
import logging
import json
import yaml

logging.basicConfig(format='%(asctime)s [%(levelname)s] %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)


def merge_dicts(dict1, dict2):
    """Recursively merges two dictionaries."""
    for key, value in dict2.items():
        if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
            merge_dicts(dict1[key], value)
        else:
            dict1[key] = value

def get_secret_as_dict(secret_arn, aws_region):
    client = boto3.client('secretsmanager', region_name=aws_region)
    response = client.get_secret_value(SecretId=secret_arn)

    if 'SecretString' in response:
        secret_string = response['SecretString']
    else:
        raise RuntimeError(f'SecretString not found in response when retrieving secret value: {secret_arn}')

    try:
        secret_dict = json.loads(secret_string)
    except json.JSONDecodeError as json_error:
        raise RuntimeError(f"Failed to parse secret string as JSON: {json_error}")
    return secret_dict


def modify_auth_config(yaml_dict, auth_aws_secret_arn, aws_region, auth_type):
    security_realm_id = "oic" if auth_type.lower() == "oidc" else auth_type.lower()
    auth_secret_dict = get_secret_as_dict(auth_aws_secret_arn, aws_region)
    if "securityRealm" not in yaml_dict.get("jenkins", {}):
        logging.warning('Unable to find jenkins.securityRealm path in initial Jenkins config yaml, creating securityRealm object')
        yaml_dict.get("jenkins", {})["securityRealm"] = {}
    if security_realm_id not in yaml_dict.get("jenkins", {}).get("securityRealm", {}):
        logging.warning(f'Unable to find jenkins.securityRealm.{security_realm_id} path in initial Jenkins config yaml, creating {security_realm_id} object')
        yaml_dict.get("jenkins", {}).get("securityRealm", {})[security_realm_id] = {}
    yaml_auth_dict = yaml_dict.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {})
    merge_dicts(yaml_auth_dict, auth_secret_dict)


def main():
    logging.info("Starting process to load auth config into Jenkins config yaml")
    parser = argparse.ArgumentParser(description="CI config setup helper.")
    parser.add_argument("--initial-jenkins-config-file-path", type=str, required=True, help="The file path for the initial jenkins config yaml file to load from and be modified in place, e.g. /initial_jenkins.yaml")
    parser.add_argument("--auth-aws-secret-arn", type=str, required=True, help="The AWS Secrets Manager Secret ARN to pull auth config from and populate into jenkins config")
    parser.add_argument("--aws-region", type=str, required=True, help="The AWS region for the boto3 client to use, e.g. us-east-1")
    parser.add_argument("--auth-type", type=str, required=True, help="The Jenkins auth type to use", choices=['oidc', 'github'])
    args = parser.parse_args()
    file_path = args.initial_jenkins_config_file_path
    logging.info(f"The following args were provided: {args}")

    # Read input file data
    try:
        with open(file_path, 'r') as file:
            yaml_data = yaml.safe_load(file)
    except FileNotFoundError:
        raise FileNotFoundError(f"Error: The file '{file_path}' does not exist.")
    except yaml.YAMLError as e:
        raise ValueError(f"Error parsing YAML file '{file_path}': {e}")

    # Modify input data as needed
    modify_auth_config(yaml_data, args.auth_aws_secret_arn, args.aws_region, args.auth_type)

    # Write file with updated data
    try:
        with open(file_path, 'w') as file:
            yaml.dump(yaml_data, file, default_flow_style=False)
    except Exception as e:
        raise IOError(f"Error writing to file '{file_path}': {e}")
    logging.info("Process completed to load auth config into Jenkins config yaml")


if __name__ == "__main__":
    main()
