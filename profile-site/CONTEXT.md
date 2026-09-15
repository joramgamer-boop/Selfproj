# Profile Site

Glossary for the profile site: a single-owner, one-page site that shows a
curated set of facts about its owner. Terms here are the canonical vocabulary
for code, issues, tests and commit messages.

## People and the whole

**Profile**:
The whole set of content about the owner that the site shows. There is exactly
one Profile, and it belongs to exactly one person, the Owner.
_Avoid_: Portfolio, CV, résumé, account

**Owner**:
The one person the Profile is about, who is also the only person who edits it.
_Avoid_: User, author, admin

**Visitor**:
Anyone reading the site. A Visitor can read everything and change nothing.
_Avoid_: User, viewer, reader

**Display Name**:
How the Owner is named on the page: first name plus Handle, never the full
legal name.
_Avoid_: Username, real name

**Handle**:
The Owner's chosen short public name, shown beside the first name.
_Avoid_: Username, nickname, alias

## Sections

**Section**:
One of the fixed content types the Profile is made of: Bio, Now, Projects,
Skills, Links. The set of Sections is fixed by the project, not by content.
_Avoid_: Block, module, widget, page

**Bio**:
The Section that says who the Owner is: a Tagline and a prose body. College,
degree and expected graduation live in the prose, not as separate fields.
_Avoid_: About, summary, intro

**Tagline**:
The one-line statement at the top of the Bio.
_Avoid_: Headline, slogan, subtitle

**Now**:
The Section that says what the Owner is doing at the moment: a short list of Now
Items and one Updated date for the whole Section. The only Section expected to
go stale.
_Avoid_: Status, updates, currently

**Now Item**:
One line in Now, with a Kind: Learning, Building, Reading or Other.
_Avoid_: Entry, activity, status line

**Updated**:
The date the Owner last changed Now. Set by hand when editing, shown plainly to
the Visitor, never hidden or aged out.
_Avoid_: Last modified, timestamp

**Project**:
One thing the Owner has made or is making. A Project is a claim the Owner
chooses to make, never something derived from what happens to exist in a
folder or repository. Has a Status, a Started month, an optional Ended month,
and the Skills it used.
_Avoid_: Repo, work, piece, portfolio item

**Status**:
Where a Project is in its life: Active, Paused, Done or Archived. Active
Projects are shown first; the rest follow by most recent Started.
_Avoid_: State, phase, stage

**Skill**:
One thing the Owner claims to be able to use or do, with a Category: Language,
Framework, Tool or Practice. Skills have no level or rating; a Project that
lists a Skill is its evidence. Every Skill a Project lists must exist in the
Skills Section. A certification is not a Skill and an event attended is not a
Project; both are sentences in the Bio.
_Avoid_: Tech, stack item, competency, proficiency, certification

**Link**:
One outbound URL to somewhere the Owner exists elsewhere on the web. The URL
is absolute and on the web (`http` or `https`), so a relative path or a
`mailto:` address is never a Link. Exactly one Link is the Contact Channel.
_Avoid_: Social, handle, profile link

**Contact Channel**:
The single Link a Visitor is invited to use to reach the Owner. The Owner
publishes no email address or phone number.
_Avoid_: Contact info, email, DM
