pipeline {
    agent any

    environment {
        NODE_TOOL = 'node-22'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Node') {
            steps {
                nodejs(env.NODE_TOOL) {
                    bat 'node --version'
                    bat 'npm --version'
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                nodejs(env.NODE_TOOL) {
                    bat 'npm install'
                }
            }
        }

        stage('Verificar build') {
            steps {
                bat 'echo "✅ Build completado exitosamente"'
                bat 'dir'
                bat 'echo "Archivos en el directorio:"'
                bat 'dir *.js'
            }
        }
    }

    post {
        success {
            echo '✅ Build de YRELIS-BACKEND-JS completado correctamente.'
        }
        failure {
            echo '❌ El build de YRELIS-BACKEND-JS falló.'
        }
    }
}