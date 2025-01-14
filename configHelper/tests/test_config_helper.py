from configHelper.config_helper import main
from pathlib import Path
from unittest.mock import patch
import json
import shutil
import yaml

TEST_RESOURCES_PATH = f"{Path(__file__).parents[1]}/tests/resources"
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

def compare_yaml_files_security_realm_updates(initial_config_file, updated_config_file, expected_auth_config, security_realm_id, ignore_security_realm_full_comparison = False):
    with open(initial_config_file, 'r') as f1, open(updated_config_file, 'r') as f2:
        initial_data = yaml.safe_load(f1)
        updated_data = yaml.safe_load(f2)
        updated_data_security_realm = updated_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {})
        assert updated_data_security_realm == expected_auth_config
        # Ensure other values besides security realm have not changed
        initial_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {}).clear()
        updated_data.get("jenkins", {}).get("securityRealm", {}).get(security_realm_id, {}).clear()
        if ignore_security_realm_full_comparison:
            initial_data.get("jenkins", {}).pop("securityRealm", None)
            updated_data.get("jenkins", {}).pop("securityRealm", None)
        assert initial_data == updated_data


def test_valid_oidc_auth_config(tmp_path):
    # tmp_path fixture cleans up any files in its directory automatically after test execution
    source_jenkins_file_path = f"{TEST_RESOURCES_PATH}/sampleJenkinsOICAuth.yaml"
    tmp_file_path = f"{tmp_path}/oicAuthTestJenkins.yaml"
    shutil.copy(source_jenkins_file_path, tmp_file_path)
    with (patch("sys.argv", ["config_helper.py", f"--initial-jenkins-config-file-path={tmp_file_path}",
                            "--auth-aws-secret-arn=arn:aws:secretsmanager:123456789012:secret/test-secret",
                            "--auth-type=oidc",
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
                "wellKnownOpenIDConfigurationUrl": "https://my.openid-config.com"
            }
        }
    }
    compare_yaml_files_security_realm_updates(initial_config_file=source_jenkins_file_path,
                                              updated_config_file=tmp_file_path,
                                              expected_auth_config=expected_oic_auth_dict,
                                              security_realm_id="oic")


def test_valid_github_auth_config(tmp_path):
    # tmp_path fixture cleans up any files in its directory automatically after test execution
    source_jenkins_file_path = f"{TEST_RESOURCES_PATH}/sampleJenkinsGithubAuth.yaml"
    tmp_file_path = f"{tmp_path}/githubAuthTestJenkins.yaml"
    shutil.copy(source_jenkins_file_path, tmp_file_path)
    with (patch("sys.argv", ["config_helper.py", f"--initial-jenkins-config-file-path={tmp_file_path}",
                             "--auth-aws-secret-arn=arn:aws:secretsmanager:123456789012:secret/test-secret",
                             "--auth-type=github",
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
    compare_yaml_files_security_realm_updates(initial_config_file=source_jenkins_file_path,
                                              updated_config_file=tmp_file_path,
                                              expected_auth_config=expected_github_auth_dict,
                                              security_realm_id="github")


def test_missing_auth_config_gets_added(tmp_path):
    # tmp_path fixture cleans up any files in its directory automatically after test execution
    source_jenkins_file_path = f"{TEST_RESOURCES_PATH}/sampleJenkinsNoSecurityRealm.yaml"
    tmp_file_path = f"{tmp_path}/missingAuthTestJenkins.yaml"
    shutil.copy(source_jenkins_file_path, tmp_file_path)
    with (patch("sys.argv", ["config_helper.py", f"--initial-jenkins-config-file-path={tmp_file_path}",
                             "--auth-aws-secret-arn=arn:aws:secretsmanager:123456789012:secret/test-secret",
                             "--auth-type=github",
                             "--aws-region=us-east-1"]),
          patch("boto3.client") as mock_boto_client):
        # Mock the get_secret_value call
        mock_client_instance = mock_boto_client.return_value
        mock_client_instance.get_secret_value.return_value = {
            "SecretString": MOCK_GITHUB_SECRET
        }
        main()
    # Expected should be same as MOCK_GITHUB_SECRET since there was no existing auth configuration in initial jenkins yaml
    expected_github_auth_dict = json.loads(MOCK_GITHUB_SECRET)
    compare_yaml_files_security_realm_updates(initial_config_file=source_jenkins_file_path,
                                              updated_config_file=tmp_file_path,
                                              expected_auth_config=expected_github_auth_dict,
                                              security_realm_id="github",
                                              ignore_security_realm_full_comparison=True)