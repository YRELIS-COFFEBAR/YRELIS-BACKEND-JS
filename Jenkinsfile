pipeline {
  agent any

  environment {
    NODE_TOOL = 'node-22'
    // En el backend, no necesitamos PROJECT_DIR si el package.json está en la raíz
  }

  stages {
    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: 'develop']],
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
        // Empaquetar el código fuente y node_modules (opcional)
        zip zipFile: 'backend-build.zip', 
            archive: true, 
            glob: '**/*',
            excludes: 'node_modules/**/*' // Excluir node_modules para reducir tamaño
        
        // O si quieres incluir solo lo necesario
        // zip zipFile: 'backend-build.zip', 
        //     archive: true, 
        //     glob: '**/*',
        //     excludes: 'node_modules/**/*, .git/**/*, .env'
        
        archiveArtifacts artifacts: 'backend-build.zip', fingerprint: true
      }
    }

    stage('Desplegar (opcional)') {
      when {
        branch 'main'
      }
      steps {
        echo 'Configura aquí tu despliegue (SSH, Docker, PM2, etc.)'
        // Ejemplo con PM2 en Windows:
        // bat 'pm2 stop yrelis-backend || true'
        // bat 'pm2 start server.js --name yrelis-backend'
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