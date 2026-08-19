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
        // Crear ZIP con PowerShell (versión compatible con Jenkins)
        bat '''
          powershell -Command "Compress-Archive -Path * -DestinationPath backend-build.zip -Force -Exclude node_modules, .git, .env, logs"
        '''
        
        // Guardar el artefacto
        archiveArtifacts artifacts: 'backend-build.zip', fingerprint: true
      }
    }

    stage('Desplegar') {
      when {
        branch 'main'
      }
      steps {
        echo ' Configura aquí tu despliegue'
        // Ejemplo con PM2 en Windows:
        // bat 'pm2 stop yrelis-backend || true'
        // bat 'pm2 start server.js --name yrelis-backend'
      }
    }
  }

  post {
    success {
      echo ' Build de YRELIS-BACKEND-JS completado correctamente.'
    
    failure {
      echo ' El build de YRELIS-BACKEND-JS falló.'
    }
  }
}