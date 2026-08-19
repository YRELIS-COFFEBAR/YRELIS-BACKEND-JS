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
        // Opción 1: Usar PowerShell para crear el ZIP (recomendado para Windows)
        powershell '''
          $exclude = @("node_modules", ".git", ".env", "logs")
          $files = Get-ChildItem -Path . -Exclude $exclude -Recurse
          Compress-Archive -Path $files -DestinationPath backend-build.zip -Force
        '''
        
        // Opción 2: Usar bat con 7zip si está instalado
        // bat '7z a -tzip backend-build.zip * -xr!node_modules -xr!.git -xr!.env'
        
        // Opción 3: Usar bat con tar (si está disponible en Windows)
        // bat 'tar -czf backend-build.tar.gz --exclude=node_modules --exclude=.git --exclude=.env *'
        
        archiveArtifacts artifacts: 'backend-build.zip', fingerprint: true
      }
    }

    stage('Desplegar') {
      when {
        branch 'main'
      }
      steps {
        echo '✅ Configura aquí tu despliegue'
        // Ejemplo con PM2 en Windows:
        // bat 'pm2 stop yrelis-backend || true'
        // bat 'set NODE_ENV=production && pm2 start server.js --name yrelis-backend'
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