Feature: Reuse the created user's data

  @user
  Scenario: Read user details returned by the create-user feature
    * def creation = call read('classpath:features/create-user.feature')
    * def username = creation.createdUser.username
    * def firstName = creation.createdUser.firstName
    * def lastName = creation.createdUser.lastName
    * def email = creation.createdUser.email
    * def password = creation.createdUser.password
    * def phone = creation.createdUser.phone
    * match username == '#string'
    * match firstName == '#string'
    * match lastName == '#string'
    * match email == '#string'
    * match password == '#string'
    * match phone == '#string'
