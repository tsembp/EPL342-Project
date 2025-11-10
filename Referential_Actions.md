# Database Constraints and Assumptions

## User-related

* Deleting a **User**:

  * **Cascades**: `UserPreferences`, `Passenger`, `Driver`, `CompanyRepresentative`, `PersonDocument`, `InAppMessage` **(as sender/recipient → NO ACTION, so no cascade!)**
  * **NO ACTION**: `Rating` (as Author/Target), `InAppMessage` (Sender/Recipient), `GdprLog` (ActorUser)
  * **Effect**: You **cannot** delete a user if they have Ratings, In-App Messages, or GDPR Logs referencing them. Handle via soft-delete or explicit cleanup via stored procedure.

* Deleting a **Passenger** (child of User; cascades from User):

  * **Cascades**: `RideRequest`

* Deleting a **Driver** (child of User; cascades from User):

  * **NO ACTION** dependents (none directly). Rides reference **Driver** via `Ride.DriverUserId → Driver(UserId)` with **NO ACTION**, so you **cannot** delete a driver if rides exist for them.

## Party / Card / Company

* **Party**:

  * `User → Party` and `Company → Party` are **NO ACTION** (no cascade).
  * `Payment(Sender/Receiver) → Party` is **NO ACTION**.

* **CreditCard**:

  * `CreditCard.OwnerId → Party` is **NO ACTION**.
  * Deleting a card **does not cascade** anywhere. App must handle loss of default/active card.

* **Company**:

  * Deleting a company:

    * **Cascades**: `CompanyRepresentative` (CompanyId → CASCADE)
    * **Cascades**: `Driver` (if Driver is working at Company)
  * **NO ACTION**: `Party` (Company.PartyId → NO ACTION)

* **CompanyRepresentative**:

  * Deleting a representative’s **User** cascades the **CompanyRepresentative** row.

## Vehicle-related

* Deleting a **Vehicle**:

  * **Cascades**: `VehicleDocument`, `VehicleTest`, `VehicleAvailabilityDaily`, `VehicleLocationLive`, `UserServiceEnrollment` (VehicleId → CASCADE)
  * **NO ACTION**: `Ride` (Ride.VehicleId → NO ACTION), `DispatchOffer` (VehicleId → NO ACTION)

* Deleting a **VehicleType**:

  * **Cascades**: `AllowedRideProfile` rows that reference it (CASCADE)

* Deleting a **User** who **owns** vehicles (`Vehicle.UserOwnerId → User` is CASCADE):

  * **Cascades**: their `Vehicle` rows, and thus all vehicle child rows listed above.

## Service / Ride-profile mapping

* Deleting a **ServiceType** or **RideType**:

  * **Cascades**: `ServicetypeAllowedRidetype` and `AllowedRideProfile` rows referencing them

## Geofence / Bridge / Itinerary

* Deleting a **Geofencezone**:

  * `Bridge.FromZone/ToZone` are **NO ACTION**, delete with stored procedure/trigger.

* Deleting a **Bridge**:

  * **Cascades**: `LegCrossesBridge` (Bridge → CASCADE)
  * `ItineraryLeg.ViaBridgeId` is **SET NULL** (leg keeps existing, reference cleared)

* Deleting a **RideRequest**:

  * **Cascades**: `ItineraryLeg` (RideRequestId → CASCADE)

* Deleting an **ItineraryLeg**:

  * **Cascades**: `LegCrossesBridge` (ItineraryLeg → CASCADE)
  * **Cascades**: `DispatchOffer` (LegId → CASCADE)

## Dispatch offers / Rides / Messages / Ratings / Payments

* Deleting a **DispatchOffer**:

  * `Ride.OfferId` is **NO ACTION** → you **cannot** delete an offer that has a Ride; delete/handle the ride first.

* Deleting a **Ride**:

  * **Cascades**: `InAppMessage` (Ride → CASCADE)
  * **SET NULL**: `Rating`, `Payment` references on the ride
  * **NO ACTION**: `DriverUserId`, `PassengerUserId`, `VehicleId` → the ride protects those rows from deletion

* Deleting a **User** involved in messages/ratings:

  * **Ratings** (Author/Target) are **NO ACTION** → cannot delete user while ratings exist.
  * **InAppMessage** Sender/Recipient are **NO ACTION** → cannot delete user while messages exist.

* Deleting a **Rating** or **Payment**:

  * `Ride` sets the reference to **NULL** (no cascade to the Ride’s existence).

## GDPR

* Deleting a **User**:

  * **Cascades**: `GdprRequest` (UserId → CASCADE)

* Deleting a **GdprRequest**:

  * `GdprLog.GdprId` is **NO ACTION** → you **cannot** delete a request while logs exist; delete logs first (or switch to CASCADE if desired).

* Deleting a **User** who authored GDPR logs (`GdprLog.ActorUserId → User`):

  * **NO ACTION** → cannot delete until logs are handled.

## Admin / Operator

* Deleting an **Admin**:

  * `Operator.ApprovedByAdmin` is **NO ACTION** (policy: admin users never deleted)