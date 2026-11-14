# Group Project Contract

A student application that helps teams share preferences, solve disagreements and create group project agreements.

## Team responsibilities

- Mateo: account screens, team creation, project details, invitations and membership.
- Erdeta: working preferences and agreement negotiation.
- Andrej: contract management and conflict resolution.

## Mateo's implemented features

- Sign up, email confirmation, login and logout.
- Create teams and save project details.
- View owned and joined teams.
- Edit and delete teams as the owner.
- Create invitations for specific email addresses.
- Accept or decline invitations using the invited account.
- View invitation statuses and joined members.
- Open the preferences flow with the selected team ID.
- Switch between English, Croatian and Albanian.

Invitations are stored in the database. The application does not automatically email invitation links. The owner shares the invitation link with the recipient.

## Technologies

Mateo's section uses:

- HTML, CSS and JavaScript.
- Supabase Authentication.
- Supabase PostgreSQL and Row Level Security.
- i18next with separate JSON translation files.
- Intl for locale-aware formatting and sorting.

## Run locally

1. Clone the repository.
2. Switch to the branch containing the implementation.
3. Open the repository folder in VS Code.
4. Serve the repository root using a local web server, such as Live Server or Live Preview.
5. Open /mateo/index.html through that server.

Do not open the HTML files directly using file://. The translation files are loaded using fetch and require an HTTP server.

Keep the repository folder structure unchanged so links between Mateo's and Erdeta's pages work.

## Supabase setup

The existing team project is configured in:

mateo/supabase-client.js

To configure a separate Supabase project:

1. Create a Supabase project.
2. Run database/mateo-setup.sql in its SQL Editor using an administrative database connection.
3. Set supabaseUrl and supabaseKey in mateo/supabase-client.js to the new project's URL and publishable key.
4. Keep email confirmation enabled for email/password signup.
5. Configure the Authentication Site URL for your local or deployed website.
6. Add the login page URL to the allowed redirect URLs.

For example, when the local server runs on port 3011, the signup confirmation redirect is:

http://127.0.0.1:3011/mateo/login.html

Use the actual hostname and port of your server. localhost and 127.0.0.1 are different origins, so use one consistently.

The browser uses the publishable key. Never place a Supabase secret key, service-role key or database password in frontend files.

## Database structure

database/mateo-setup.sql contains:

- teams: team ownership and project details.
- invitations: recipients, response statuses and timestamps.
- team_members: links between authenticated users and teams.
- Row Level Security policies.
- An access-check function.
- A trigger that adds each new team's owner as a member.
- respond_to_invitation: accepts or declines an invitation.
- get_team_members: returns member details for an accessible team.

The tables reference users managed by Supabase Authentication.

Deleting a team also deletes its invitations and memberships through foreign-key cascades.

The setup file does not create test accounts or insert fictional seed data.

## Accounts and invitations

1. Sign up through the application.
2. Confirm the account using the emailed confirmation link.
3. Log in using the password chosen for this application.
4. Create a team and enter its project details.
5. Open Invite members.
6. Add an email address and save the invitation.
7. Open the saved invitation and copy its URL.
8. Share the URL with the recipient.
9. The recipient logs in with the invited email and accepts or declines.

A local address beginning with 127.0.0.1 works only on the computer running the server. Use a deployed website address when sharing links with teammates on other computers.

For local testing, use a normal browser window for the owner and a private window for the invited account.

## Languages

Mateo's translation resources are:

- mateo/locales/en.json
- mateo/locales/hr.json
- mateo/locales/sq.json

mateo/i18n.js loads these resources through i18next.

The selected language is stored under appLanguage in localStorage. Account, team, invitation and membership records are stored in Supabase.

## Preferences handoff

The team setup page opens:

erdeta/communication.html?teamId=SELECTED_TEAM_ID

This passes the selected team ID into the preferences flow.

Opening that page does not by itself verify that preference answers are saved for the correct user and team. The combined application must preserve that context throughout the flow.

## Manual checking

Mateo reported successful checks of:

- Accepting and declining invitations.
- Editing and saving team details.
- Language switching and persistence after reload.
- Opening the preferences page.
- Cancelling and confirming team deletion.
- Keyboard focus and required-field validation.
- Narrow layouts and 200% zoom on Create team, Invite members and Team members.
- Blocking a regular member from the owner's edit page.

Further checks remain for invalid and duplicate invitations, network failures, screen-reader behaviour and direct database access controls.

The combined setup SQL has not yet been verified on a fresh database.

## Evidence

Screenshots are being collected for the final team report.

They cover team members in three languages, pending invitations, joining, team setup, editing, deletion confirmation, mobile layout, keyboard focus and team creation.

## Collaboration

Work is developed on individual branches and submitted through pull requests.

A teammate should review each pull request before it is merged into main.

The final team submission includes the completed report, repository details and release tag.