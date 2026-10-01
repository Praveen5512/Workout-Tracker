# Workout Tracker PWA – Product Requirements

## 1. Product Overview

The Workout Tracker is a Progressive Web App (PWA) designed to help users record, review, and analyze their workout activity.

The application should be primarily optimized for mobile usage while remaining responsive across different screen sizes. It should continue to function when there is no internet connection and synchronize locally recorded changes with the backend once connectivity is restored.

The application will use Google Sheets as the backend data store through a Google Apps Script API.

The backend is expected to be relatively slow. Therefore, the application should be designed so that normal user interactions do not depend on the speed of the backend.

The primary objective is to provide an application that feels fast and responsive even when the backend is slow or temporarily unavailable.

---

# 2. Core Requirements

## 2.1 PWA and Mobile Responsiveness

The application should be developed as a PWA.

The application should:

* Be installable as a PWA.
* Work effectively on mobile devices.
* Have a mobile-first responsive design.
* Adapt to different screen sizes.
* Provide touch-friendly controls.
* Support normal application usage without requiring a constant internet connection.
* Provide appropriate visual feedback for online, offline, and synchronization states.

The mobile interface should be the primary design consideration.

---

# 3. Offline Support and Synchronization

The application must support offline usage.

Users should be able to interact with their workout data even when the device does not have an internet connection.

Offline functionality should include:

* Viewing workout data.
* Creating workout logs.
* Editing workout logs.
* Deleting workout logs.
* Viewing relevant analytics based on locally available data.

When the application is offline, changes should be stored locally.

When internet connectivity becomes available, locally stored changes should synchronize with the backend.

The synchronization process should happen without requiring the user to manually recreate their workout entries.

The application should provide a clear indication of its current synchronization state.

Possible states include:

* Online.
* Offline.
* Syncing.
* Synced.
* Pending synchronization.

The offline and synchronization state should be visible from the application header.

---

# 4. Performance Requirements

Performance is an important requirement because the backend is expected to respond more slowly than the local application.

The application should therefore minimize dependency on backend response times.

The user interface should remain responsive while backend operations are taking place.

The application should prioritize locally available data for normal UI operations.

Backend communication should primarily be used for synchronization and persistence rather than making every UI interaction dependent on an API request.

The application should avoid unnecessary API requests.

Data that is already available locally should not repeatedly be requested from the backend unless synchronization or data refresh requires it.

---

# 5. Backend

The current backend is a Google Apps Script Web App connected to Google Sheets.

The API provides CRUD operations for workout records.

The backend deployment configuration is:

* Execute as: deployment owner.
* Access: Anyone.
* Protocol: HTTPS.
* Data format: JSON.
* POST requests use `text/plain;charset=utf-8`.

The current API supports:

* Read all records.
* Read one record.
* Create a record.
* Update a record.
* Delete a record.

The Google Sheet row number is used as the record ID.

The existing ID approach is acceptable and does not need to be changed.

---

# 6. Workout Data Schema

The Google Sheet contains the following fields:

| Field            | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| Date             | Date of the workout                                            |
| Exercise         | Name of the exercise performed                                 |
| Sets             | Number of completed sets                                       |
| Reps             | Number of repetitions                                          |
| Weight/Intensity | Weight, resistance, bodyweight, or other intensity information |
| Duration (min)   | Duration in minutes                                            |
| Notes            | Additional information about the workout                       |

The schema is:

```text
Date
Exercise
Sets
Reps
Weight/Intensity
Duration (min)
Notes
```

The data model should be consistently used throughout the application.

The Home Screen, Analytics and Dashboard, List Data, workout creation, workout editing, and synchronization functionality should all work against this schema.

---

# 7. Main Application Areas

The application will have three primary areas:

1. Home Screen
2. Analytics and Dashboard
3. List Data

These areas serve different purposes.

The Home Screen provides a quick overview of current activity and performance.

The Analytics and Dashboard area provides deeper insights into progress and performance.

The List Data area provides detailed access to workout records, including filtering and date-based browsing.

---

# 8. Home Screen

The Home Screen is the primary screen of the application.

It should provide an immediate overview of the user's current workout activity without requiring the user to navigate through multiple screens.

## 8.1 Header

The Home Screen should have a header.

The header should contain the application identity and the current application state.

The header should provide an indication of:

* Whether the application is online or offline.
* Whether data is currently being synchronized.

The synchronization state should be easily understandable without interrupting the user's normal workflow.

---

## 8.2 Weekly Performance Card

The Home Screen should contain a Performance Card.

The Performance Card should provide information about the user's performance over the current week.

The purpose of this card is to give the user a quick understanding of their weekly activity.

The card can represent information derived from the available workout fields, such as:

* Workout activity.
* Number of workouts.
* Sets.
* Duration.
* Workout volume where applicable.
* Weekly performance trends.

The detailed metrics are expected to be derived from the available workout data rather than requiring additional fields in the Google Sheet.

---

## 8.3 Additional Metric Cards

Below or around the main Performance Card, the Home Screen should contain additional cards representing other useful metrics.

These cards should help the user:

* Identify gaps in their workout activity.
* Understand areas that need improvement.
* Recognize trends.
* Determine what to focus on next.
* Track progress toward better consistency and performance.

The cards should provide useful information rather than simply duplicating the information shown in the main Performance Card.

---

## 8.4 Weekly Workout List

Below the metric cards, the Home Screen should display the workouts completed during the current week.

The list should show workout information in a compact format suitable for mobile viewing.

The purpose of this section is to allow the user to quickly see what they have completed during the current week.

The list should use the existing workout schema.

Relevant information may include:

* Date.
* Exercise.
* Sets.
* Reps.
* Weight/Intensity.
* Duration.

The detailed Notes field does not need to dominate the weekly list and can be shown when viewing a workout in more detail.

---

## 8.5 Create Workout Button

The Home Screen should have a floating action button positioned in the bottom-right corner.

The purpose of the button is to create a new workout log.

Selecting the button should provide the user with the workout logging interface.

The creation interface should correspond to the Google Sheet schema:

* Date.
* Exercise.
* Sets.
* Reps.
* Weight/Intensity.
* Duration.
* Notes.

---

# 9. Analytics and Dashboard

The Analytics and Dashboard section should provide a broader view of workout activity and progress.

This section should be more analytical than the Home Screen.

The Home Screen provides a quick summary, while the Analytics and Dashboard provides deeper information about workout behavior and performance.

## 9.1 Streaks

The dashboard should contain workout streak information.

Streaks should help the user understand their consistency over time.

The application should be able to represent information such as:

* Current workout streak.
* Previous or best streak.
* Consistency across a selected period.

---

## 9.2 Progress Metrics

The dashboard should provide metrics that help the user understand progress over time.

Progress should be calculated from the existing workout data.

Possible areas for analysis include:

* Changes in workout frequency.
* Changes in sets and repetitions.
* Changes in weight/intensity.
* Changes in workout duration.
* Exercise-specific progress.
* Progress over different time periods.

---

## 9.3 Performance Metrics

The dashboard should provide performance-oriented information.

Performance metrics should help the user understand how their workout activity is changing.

Metrics can be derived from:

* Sets.
* Reps.
* Weight/Intensity.
* Duration.
* Exercise frequency.
* Workout frequency.

Where numerical calculations are appropriate, the dashboard should represent changes over time rather than only showing isolated values.

---

## 9.4 Additional Analytics

The Analytics and Dashboard section should support additional useful analytics beyond streaks, progress metrics, and performance metrics.

The goal is to provide meaningful insights into workout behavior and identify areas where the user can improve.

The analytics should be based on the existing workout schema.

No additional mandatory fields are currently defined for analytics.

---

# 10. List Data

The List Data section is the detailed workout data interface.

It should allow the user to browse, search, filter, and inspect workout records.

## 10.1 Default Data

When the List Data section is opened, it should display the current month's data by default.

The user should not need to manually select the current month every time they open the page.

---

## 10.2 Field-Based Filters

The List Data section should provide filtering based on the workout fields.

The fields available for filtering correspond to the Google Sheet schema:

* Date.
* Exercise.
* Sets.
* Reps.
* Weight/Intensity.
* Duration (min).
* Notes.

The filtering interface should be appropriate for each type of field.

For example, numeric fields can support numeric filtering, while Exercise can support exercise selection or search.

---

## 10.3 Date Selection

The user should be able to change the date selection used for displaying workout data.

The default date range is the current month.

The user should be able to select a different date or date range to retrieve and display the corresponding workout data.

The displayed list should update according to the selected date criteria.

---

# 11. General UI Principles

The UI should be designed primarily for mobile use.

The interface should prioritize:

* Clear information hierarchy.
* Easy touch interaction.
* Readable workout information.
* Compact but useful cards.
* Fast navigation.
* Minimal unnecessary interaction.
* Clear application state.
* Clear offline and synchronization status.

The interface should avoid making the user wait for backend operations before updating the normal application interface.

---

# 12. Data and Backend Interaction

The application should treat the backend as a slower external persistence layer.

Normal user interaction should not unnecessarily depend on immediate backend responses.

Workout data should be available locally for application usage.

Synchronization should handle communication between local data and the Google Apps Script API.

The existing API operations are:

```text
GET  ?action=readAll

GET  ?action=readOne&id={rowId}

POST
{
  "action": "create",
  "data": { ... }
}

POST
{
  "action": "update",
  "id": {rowId},
  "data": { ... }
}

POST
{
  "action": "delete",
  "id": {rowId}
}
```

The existing Google Sheet row-based ID remains the record identifier.

---

# 13. Overall User Experience

The intended experience is that the Workout Tracker behaves like a native mobile application even though the backend is based on Google Apps Script and Google Sheets.

The user should be able to open the application and immediately see their workout information.

The user should be able to record a workout without being concerned about whether the backend is currently reachable.

The application should continue functioning when offline.

When connectivity becomes available, the application should synchronize the relevant changes with the backend.

The Home Screen should provide a quick understanding of the current week's activity.

The Analytics and Dashboard should provide deeper understanding of streaks, progress, and performance.

The List Data section should provide detailed access to the underlying workout records with filtering and date selection.

The overall application should prioritize responsiveness, mobile usability, offline capability, and meaningful workout insights while working within the limitations of the existing Google Sheets backend.
