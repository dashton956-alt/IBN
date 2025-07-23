pipeline {
    agent any
    environment {
        TRIVY_VERSION = '0.50.0'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Build Docker Images') {
            steps {
                sh 'docker compose build'
            }
        }
        stage('Vulnerability Scan') {
            steps {
                sh '''
                curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin ${TRIVY_VERSION}
                for image in $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>'); do
                  trivy image --exit-code 1 --severity HIGH,CRITICAL $image
                done
                '''
            }
        }
        stage('Test') {
            parallel {
                stage('YAML Syntax Check') {
                    steps {
                        echo 'Checking YAML syntax...'
                        sh 'docker run --rm -v "${PWD}":/data cytopia/yamllint . || true'
                    }
                }
                stage('Dockerfile Lint') {
                    steps {
                        echo 'Linting Dockerfile...'
                        sh 'docker run --rm -i hadolint/hadolint < Dockerfile || true'
                    }
                }
                stage('ShellCheck') {
                    steps {
                        echo 'Checking shell scripts...'
                        sh 'find . -name "*.sh" -exec docker run --rm -v "${PWD}":/mnt koalaman/shellcheck:stable shellcheck /mnt/{} \; || true'
                    }
                }
                stage('Unit Tests') {
                    steps {
                        echo 'Run unit tests (customize for your stack)...'
                        // Example: sh 'pytest tests/'
                    }
                }
                stage('Integration Tests') {
                    steps {
                        echo 'Run integration tests (customize for your stack)...'
                        // Example: sh './scripts/integration-test.sh'
                    }
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    try {
                        echo 'Starting containers...'
                        sh 'docker compose up -d'
                        sh 'docker compose ps'
                        echo 'Containers started successfully.'
                    } catch (err) {
                        echo "Deployment failed: ${err}"
                        sh 'docker compose logs || true'
                        error("Deployment failed. See logs above.")
                    }
                }
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
}
