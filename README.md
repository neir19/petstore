# Automatización API REST — Swagger Petstore

Automatización de seis operaciones de usuario con Java 17, Maven, Karate 1.5.2 y JUnit 5. Cada escenario es independiente, tiene una etiqueta propia y crea el usuario necesario. La guía paso a paso requerida está en [`README.txt`](README.txt); los hallazgos están en [`conclusiones.txt`](conclusiones.txt).

## Contrato de Petstore

Fuente: [Swagger Petstore](https://petstore.swagger.io/) y [OpenAPI 2.0](https://petstore.swagger.io/v2/swagger.json). El modelo `User` contiene `id`, `username`, `firstName`, `lastName`, `email`, `password`, `phone` y `userStatus`.

| Operación | Método y endpoint | Parámetros / request | Respuesta documentada |
| --- | --- | --- | --- |
| Crear | `POST /user` | JSON `User`; `Content-Type: application/json` | `default`; no declara status exitoso ni schema de respuesta |
| Buscar | `GET /user/{username}` | Path `username` requerido | `200` con `User`; `400` y `404` |
| Actualizar | `PUT /user/{username}` | Path `username`; JSON `User` completo | `default`; no declara status exitoso |
| Buscar actualizado | `GET /user/{username}` | Path `username` requerido | `200` con `User` |
| Eliminar | `DELETE /user/{username}` | Path `username` requerido | `default`; no declara status exitoso |
| Verificar eliminación | `GET /user/{username}` | Path `username` requerido | `404` usuario no encontrado |

No se especifican query parameters ni autenticación para estos endpoints. La especificación no detalla schemas de respuesta para errores ni para el resultado exitoso de POST, PUT o DELETE.

En ejecuciones contra el servicio público, POST, PUT y DELETE respondieron HTTP 200 con un `ApiResponse` de `code`, `type` y `message`; el GET a un usuario inexistente respondió HTTP 404 con `{"code":1,"type":"error","message":"User not found"}`. Esos statuses observados no se deben confundir con el contrato explícito de la especificación.

## Diseño y estructura

Cada operación tiene un escenario independiente para facilitar su ejecución por etiqueta y evitar dependencias del orden. Los escenarios de lectura de cambios y eliminación preparan sus propios datos mediante helpers, generando usernames únicos. El helper PUT recupera el usuario y modifica únicamente nombre y correo.

```text
pom.xml
README.txt
conclusiones.txt
scripts/run-tests.sh
reports/karate-reports/         # reporte HTML versionado
src/test/java/runners/UserTest.java
src/test/resources/
├── karate-config.js
├── data/user.json
├── features/user/user-lifecycle.feature
└── helpers/
    ├── create-user.feature
    ├── update-user.feature
    └── delete-user.feature
```

## Ejecución

Requiere Java 17+ y Maven. Inicio rápido:

```bash
# Suite completa y actualización del reporte versionado
bash scripts/run-tests.sh

# Suite completa sin sincronizar el reporte
mvn clean test

# Escenario individual (cambiar la etiqueta según la operación)
mvn -Dtest=UserTest -Dkarate.tags=@create test
mvn -Dtest=UserTest -Dkarate.tags=@read test
mvn -Dtest=UserTest -Dkarate.tags=@update test
mvn -Dtest=UserTest -Dkarate.tags=@read-updated test
mvn -Dtest=UserTest -Dkarate.tags=@delete test
mvn -Dtest=UserTest -Dkarate.tags=@verify-deleted test
```

Etiquetas disponibles: `@create`, `@read`, `@update`, `@read-updated`, `@delete` y `@verify-deleted`. El reporte recién generado queda en `target/karate-reports/karate-summary.html`; la copia versionable está en `reports/karate-reports/karate-summary.html`.

Si falla una aserción posterior a PUT o DELETE, inspecciona el escenario en el reporte y compara request/response: un status 200 por sí solo no demuestra que la actualización o eliminación se haya persistido.
