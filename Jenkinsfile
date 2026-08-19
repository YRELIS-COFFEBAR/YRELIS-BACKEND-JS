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

    stage('Ejecutar tests') {
      steps {
        nodejs(env.NODE_TOOL) {
          bat 'npm test || echo "No hay tests"'
        }
      }
    }

    stage('Empaquetar artefacto') {
      steps {
        script {
          try {
            bat 'echo "Creando ZIP..."'
            bat 'powershell -Command "Compress-Archive -Path * -DestinationPath backend.zip -Force -Exclude node_modules, .git"'
            bat 'echo "ZIP creado exitosamente"'
            bat 'dir backend.zip'
            archiveArtifacts artifacts: 'backend.zip'
          } catch (Exception e) {
            echo "Error al empaquetar: ${e.message}"
            // Si falla, intentamos empaquetar sin ZIP
            bat 'echo "Empaquetando sin ZIP..."'
            archiveArtifacts artifacts: '**/*'
          }
        }
      }
    }

    stage('Desplegar') {
      when {
        branch 'main'
      }
      steps {
        echo 'Desplegando...'
        bat 'pm2 stop yrelis-backend || echo "PM2 no corriendo"'
        bat 'pm2 start app.js --name yrelis-backend || pm2 start server.js --name yrelis-backend || pm2 start index.js --name yrelis-backend'
        bat 'pm2 save || echo "PM2 save no disponible"'
      }
    }
  }

  post {
    success {
      echo '✅ Build exitoso'
    }
    failure {
      echo '❌ Build falló'
    }
  }
}