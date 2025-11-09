# Database Constraints and Assumptions

## User-Related Constraints
* When a user is deleted:

  * User preferences are deleted
  * User's reviews (as author or target) are deleted
  * Associated passenger, driver, and operator records are deleted
  * GDPR requests are deleted
  * Company representative records referencing the user are deleted
  * GDPR logs remain unchanged (no action)

## Card-Related Constraints

* When credit card is deleted:

  * Reference is set to NULL for all roles (driver, passenger, company)
  * Software handles NULL card state to prompt for new card

## Company-Related Constraints

* When a company is deleted:

  * All associated drivers are deleted
  * All company representative records are deleted
* When a company representative or driver is deleted:

  * Associated vehicles are deleted

## Administrative Constraints

* When an admin who approves operators is deleted:

  * No action (admins are manually managed and never deleted - assumption)

## Vehicle-Related Constraints

* When a vehicle is deleted:

  * Vehicle availability, live location, documents, and tests are deleted
  * Related user service enrollments are deleted (need to re-enroll and get verified)

## Geofence and Ride Constraints

* When a geofence zone is deleted:

  * Related bridges are deleted
* When a bridge is deleted:

  * References in itinerary legs are set to NULL
* When an itinerary leg is deleted:

  * Related dispatch offers and leg-cross-bridge records are deleted
* When a dispatch offer is deleted:

  * Related rides are deleted
* When a ride is deleted:

  * Related in-app messages are deleted
  * Rating and payment references are set to NULL

## GDPR Constraints

* When a GDPR request is deleted:

  * Associated GDPR logs are deleted
