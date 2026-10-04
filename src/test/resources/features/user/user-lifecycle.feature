Feature: Gestion del ciclo de vida de usuarios en Petstore

  Background:
    * url baseUrl
    * header Accept = 'application/json'

  @user @create
  Scenario: Crear usuario
    * def created = call read('classpath:helpers/create-user.feature')
    * match created.createdUser.username == '#string'

  @user @read
  Scenario: Consultar el usuario creado
    * def created = call read('classpath:helpers/create-user.feature')
    When path 'user', created.createdUser.username
    And method GET
    Then status 200
    And match response.username == created.createdUser.username
    And match response.firstName == created.createdUser.firstName
    And match response.lastName == created.createdUser.lastName
    And match response.email == created.createdUser.email
    And match response.phone == created.createdUser.phone
    And match response.userStatus == created.createdUser.userStatus

  @user @update
  Scenario: Actualizar nombre y correo del usuario
    * def created = call read('classpath:helpers/create-user.feature')
    * def firstName = 'Updated_' + created.createdUser.username
    * def email = created.createdUser.username + '_updated@example.test'
    * def updated = call read('classpath:helpers/update-user.feature') { user: '#(created.createdUser)', firstName: '#(firstName)', email: '#(email)' }
    * match updated.updatedUser.firstName == firstName
    * match updated.updatedUser.email == email

  @user @read-updated
  Scenario: Consultar el usuario actualizado
    * def created = call read('classpath:helpers/create-user.feature')
    * def firstName = 'Updated_' + created.createdUser.username
    * def email = created.createdUser.username + '_updated@example.test'
    * def update = call read('classpath:helpers/update-user.feature') { user: '#(created.createdUser)', firstName: '#(firstName)', email: '#(email)' }
    When path 'user', created.createdUser.username
    And method GET
    Then status 200
    And match response.id == update.updatedUser.id
    And match response.username == created.createdUser.username
    And match response.firstName == firstName
    And match response.lastName == created.createdUser.lastName
    And match response.email == email
    And match response.password == created.createdUser.password
    And match response.phone == created.createdUser.phone
    And match response.userStatus == created.createdUser.userStatus

  @user @delete
  Scenario: Eliminar usuario
    * def created = call read('classpath:helpers/create-user.feature')
    When path 'user', created.createdUser.username
    And method DELETE
    Then status 200
    And match response.code == 200
    And match response.type == '#string'
    And match response.message == created.createdUser.username

  @user @verify-deleted
  Scenario: Confirmar que el usuario eliminado ya no existe
    * def created = call read('classpath:helpers/create-user.feature')
    * def deleted = call read('classpath:helpers/delete-user.feature') { user: '#(created.createdUser)' }
    When path 'user', created.createdUser.username
    And method GET
    Then status 404
    And match response.code == 1
    And match response.type == 'error'
    And match response.message == 'User not found'
