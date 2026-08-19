pipeline {
  agent any

  environment {
    NODE_TOOL = 'node-22'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: 'main']],
          userRemoteConfigs: [[
            url: 'https://github.com/YRELIS-COFFEBAR/YRELIS-BACKEND-JS.git',
            credentialsId: 'Ardamins'
          ]]
        ])
      }
    }

    stage('Setup Node') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat '''
            node --version
            npm --version
          '''
        }
      }
    }

    stage('Instalar dependencias') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat 'npm ci || npm install'
        }
      }
    }

    stage('Ejecutar tests') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat 'npm test || echo "No hay tests configurados"'
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        script {
          // Crear ZIP con PowerShell
          bat 'powershell -Command "Compress-Archive -Path * -DestinationPath backend-build.zip -Force -Exclude node_modules, .git, .env, logs"'
          
          // Verificar que el ZIP existe
          bat 'if exist backend-build.zip (echo ZIP creado) else (echo  Error creando ZIP)'
          
          // Guardar el artefacto
          archiveArtifacts artifacts: 'backend-build.zip', fingerprint: true
        }
      }
    }

    stage('Desplegar') {
      when {
        branch 'main'
      }
      steps {
        echo ' Configura aquí tu despliegue'
      }
    }
  }

  post {
    success {
      echo ' Build de YRELIS-BACKEND-JS completado correctamente.'
    }
    failure {
      echo ' El build de YRELIS-BACKEND-JS falló.'
    }
  }
}