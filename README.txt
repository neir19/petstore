AUTOMATIZACION API REST - SWAGGER PETSTORE

INSTRUCCIONES DE EJECUCION PASO A PASO

1. REQUISITOS
   - Java 17 o superior
   - Maven 3.8 o superior
   - Acceso a Internet para consultar la API pública de Swagger Petstore

2. UBICAR EL PROYECTO
   Abrir una terminal en la raíz del proyecto, donde existe el archivo pom.xml.

3. VERIFICAR QUE JAVA Y MAVEN ESTEN INSTALADOS
   java -version
   mvn -version

   Si alguno de los comandos falla, instalar las herramientas antes de continuar.

4. EJECUTAR LA SUITE COMPLETA
   Opción recomendada:
   bash scripts/run-tests.sh

   Ejecución directa con Maven:
   mvn clean test

   La suite ejecuta los escenarios del archivo:
   src/test/resources/features/user/user-lifecycle.feature

   La salida final queda disponible en:
   - target/karate-reports/karate-summary.html
   - reports/karate-reports/karate-summary.html

5. EJECUTAR UN ESCENARIO ESPECIFICO POR ETIQUETA
   Cada escenario del flujo usa una etiqueta. Estos son los ejemplos disponibles:

   Crear usuario:
   mvn -Dtest=UserTest -Dkarate.tags=@create test

   Leer usuario creado:
   mvn -Dtest=UserTest -Dkarate.tags=@read test

   Actualizar usuario:
   mvn -Dtest=UserTest -Dkarate.tags=@update test

   Leer usuario actualizado:
   mvn -Dtest=UserTest -Dkarate.tags=@read-updated test

   Eliminar usuario:
   mvn -Dtest=UserTest -Dkarate.tags=@delete test

   Verificar eliminación:
   mvn -Dtest=UserTest -Dkarate.tags=@verify-deleted test

   Cada escenario es independiente y prepara sus propios datos, por lo que no depende de que otro
   haya corrido antes.

6. REPORTES Y RESULTADOS
   - Reporte HTML generado por Karate: target/karate-reports/karate-summary.html
   - Copia versionada para evidencias: reports/karate-reports/karate-summary.html
   - Resultados de Maven Surefire: target/surefire-reports/

7. DIAGNOSTICO DE FALLAS
   - Si Maven indica que no encuentra Java o Maven, revisar la instalación de ambos.
   - Si falla la conexión, verificar Internet y volver a ejecutar.
   - Abrir el reporte HTML del escenario fallido para revisar request, response y assertions.
   - Revisar también la salida de Maven en consola y los resultados en target/surefire-reports/.

8. OBSERVACIONES IMPORTANTES DEL SERVICIO
   - La URL base se define en src/test/resources/karate-config.js.
   - El modelo User se carga desde src/test/resources/data/user.json.
   - La especificación oficial de Swagger Petstore no fija un código HTTP concreto para POST, PUT y DELETE.
     Lo que valida esta automatización es el comportamiento observado contra la API pública.
   - Para asegurar que la actualización o eliminación realmente persistió, los escenarios hacen un GET
     posterior y validan el cambio o el 404 esperado.

9. DOCUMENTACION RELACIONADA
   - README.md: resumen técnico del ejercicio y referencia del contrato.
   - README.txt: guía paso a paso para ejecución local.
   - conclusiones.txt: hallazgos y conclusiones del trabajo.
