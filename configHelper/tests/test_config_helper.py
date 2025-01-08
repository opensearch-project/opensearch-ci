from configHelper.config_helper import main
from pathlib import Path
from unittest.mock import patch
import shutil
import yaml

TEST_RESOURCES_PATH = f"{Path(__file__).parents[1]}/tests/resources"
GEN_TEST_RESOURCES_PATH = f"{Path(__file__).parents[1]}/tests/resources/generated"
MOCK_OIDC_SECRET = """
{
    "clientId":"test.pytest.id",
    "clientSecret":"tyuuyohjk34jasdfOPPOEW",
    "serverConfiguration": {
        "wellKnown": {
            "wellKnownOpenIDConfigurationUrl": "https://my.openid-config.com"
        }
    }
}
"""
MOCK_GITHUB_SECRET = """
{
    "clientID":"test.pytest.id",
    "clientSecret":"tyuuyohjk34jasdfOPPOEW"
}
"""

def compare_yaml_files_security_realm_updates(intial_config_file, updated_config_file, expected_security_realm_config, security_realm_id):
    with open(intial_config_file, 'r') as f1, open(updated_config_file, 'r') as f2:
        initial_data = yaml.safe_load(f1)
        updated_data = yaml.safe_load(f2)
        initial_data_security_realm = initial_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {})
        assert initial_data_security_realm == expected_security_realm_config
        # Ensure other values besides security realm have not changed
        initial_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {}).clear()
        updated_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {}).clear()
        assert initial_data == updated_data


def test_valid_oidc_auth_config(tmp_path):
    # tmp_path fixture cleans up any files in its directory automatically after test execution
    source_jenkins_file_path = f"{TEST_RESOURCES_PATH}/sampleJenkinsOICAuth.yaml"
    tmp_file_path = f"{tmp_path}/oicAuthTestJenkins.yaml"
    shutil.copy(source_jenkins_file_path, tmp_file_path)
    with (patch("sys.argv", ["config_helper.py", f"--jenkins-config-file-path={tmp_file_path}",
                            "--auth-secret-arn=arn:aws:secretsmanager:123456789012:secret/test-secret",
                            "--security-realm-id=oic",
                             "--aws-region=us-east-1"]),
          patch("boto3.client") as mock_boto_client):
            # Mock the get_secret_value call
            mock_client_instance = mock_boto_client.return_value
            mock_client_instance.get_secret_value.return_value = {
                "SecretString": MOCK_OIDC_SECRET
            }
            main()
    # Expected is merge of source jenkins file and mock oidc secret values
    expected_oic_auth_dict = {
        "clientId": "test.pytest.id",
        "clientSecret": "tyuuyohjk34jasdfOPPOEW",
        "disableSslVerification": False,
        "escapeHatchEnabled": False,
        "logoutFromOpenidProvider": True,
        "postLogoutRedirectUrl": "",
        "escapeHatchSecret": "random",
        "userNameField": "sub",
        "serverConfiguration": {
            "wellKnown": {
                "scopes": "open-id",
                "wellKnownOpenIDConfigurationUrl": "https://my.openid-config.com"
            }
        }
    }
    compare_yaml_files_security_realm_updates(tmp_file_path, source_jenkins_file_path, expected_oic_auth_dict, "oic")


def test_valid_github_auth_config(tmp_path):
    # tmp_path fixture cleans up any files in its directory automatically after test execution
    source_jenkins_file_path = f"{TEST_RESOURCES_PATH}/sampleJenkinsGithubAuth.yaml"
    tmp_file_path = f"{tmp_path}/githubAuthTestJenkins.yaml"
    shutil.copy(source_jenkins_file_path, tmp_file_path)
    with (patch("sys.argv", ["config_helper.py", f"--jenkins-config-file-path={tmp_file_path}",
                             "--auth-secret-arn=arn:aws:secretsmanager:123456789012:secret/test-secret",
                             "--security-realm-id=github",
                             "--aws-region=us-east-1"]),
          patch("boto3.client") as mock_boto_client):
        # Mock the get_secret_value call
        mock_client_instance = mock_boto_client.return_value
        mock_client_instance.get_secret_value.return_value = {
            "SecretString": MOCK_GITHUB_SECRET
        }
        main()
    # Expected is merge of source jenkins file and mock github auth secret values
    expected_github_auth_dict = {
        "clientID": "test.pytest.id",
        "clientSecret": "tyuuyohjk34jasdfOPPOEW",
        "githubWebUri": "https://github.com",
        "githubApiUri": "https://api.github.com",
        "oauthScopes": "read:org,user:email"
    }
    compare_yaml_files_security_realm_updates(tmp_file_path, source_jenkins_file_path, expected_github_auth_dict, "github")