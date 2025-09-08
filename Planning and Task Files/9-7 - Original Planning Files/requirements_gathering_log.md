# Knowledge Vault Platform - Requirements Gathering Log

## Original User Request

**Initial Vision:**
"I wanna build a knowledge website sharing vault, notes, resources thing for myself and my friends. I want to keep track of things like resources, videos, books, my notes on all of those resources, as well as be able to share it certain parts of it or all of it with others and allow them to have or just view. I need help developing this idea and what I want from this application: how I wanted to look, what features I wanted to have."

**User's Process:**
"So I need you to ask me targeted and probing questions 1-5 at a time to get a better idea of what I'm looking for. And then I want you to look at the end how I want it to work, what I wanted to do, what features I want to have. Keep asking questions until you have enough information to completely understand what I wanna do and how I want to do it. When you do, write up a complete product requirements document and a detailed features list."

---

## Question Round 1: Foundation & Scale

### Questions Asked:
1. **Scale & Users**: How many people do you envision using this initially? Is this primarily for you with occasional sharing to friends, or do you want multiple people actively contributing content from the start?

2. **Content Types**: When you mention "resources, videos, books, notes" - are you thinking of storing the actual files (PDFs, video files) or mainly links/references with your notes and metadata about them?

3. **Organization**: How do you currently organize your knowledge/notes? Do you prefer folder structures, tags, categories, or something more like a wiki with interconnected pages?

4. **Sharing Granularity**: When you say "share certain parts" - do you want to share individual items, collections/folders, or specific sections within your notes?

5. **Access Levels**: For the people you share with, what kinds of permissions are you imagining? Just viewing, or do you want some people to be able to add comments, edit, or contribute their own content?

### User Answers:
- **Scale**: "This is meant to be a personal platform, so no more than 5. This is going to be super basic. I already know that I'm going to be hosting it on either Vercel or a similar platform that has a generous free tier. I don't plan to go past that."

- **Current Organization Method**: 
  - "I want to sort the notes based on the resource."
  - "If it's a book, if it's a video (like a long-form video, like a YouTube video), it's a podcast, or if it's like a TikTok short YouTube short or a real."

- **Content Structure**: 
  - "For each, I want it to be very similar to Obsidian. Currently, the way I have it set up is I have some information about these content sources (title, author, etc.) and then my notes underneath."
  - "If it's a video (like a short-form video), I include a separate file that houses the transcript that's tied to that resource."

- **Resource Navigation**: 
  - "I want this to be resource-tied, so like I can go on the website and see all of my resources (all the different things I can obviously sort them by the type of resources they are or just view them all)."
  - "When I click on one, it'll open up to my notes and then it'll be like additional related files (so like if it's a video it'll have a related file of either the real itself I'm going to download it if it's any video it'll also have the transcript file which just be like a simple Markdown file)."

- **Sharing Requirements**: 
  - "By these need to just be simple Markdown files, doesn't have to be super complicated or super visual for sharing."
  - "I literally just want to have a very basic occupant system that allows me to just create, choose an email to descend to that's it."
  - "I'll put in an email and I can either share all of my files or a certain one and I'll put in their email and then they'll just get an email with a link."
  - "When they try to access it, as long as they try to access it with that email (when it asks them to sign in, they access it with that email), they'll be able to see that one page that's it."

- **Access Levels**: 
  - "We're just going to do three access levels: viewer (which is view), which is view this."
  - "If it's per file right. Obviously I'll input their email profile it'll be a share the whole workspace share thing where they'll share all the files I have in the viewing format."
  - "When I'm sharing it'll ask do I want them to be a viewer or editor. If they're an editor, they will have the exact same permissions as me."

---

## Question Round 2: Workflow & Interface Details

### Questions Asked:
1. **Adding Resources**: When you add a new resource, do you want a simple form where you fill in the metadata (title, author, type, etc.) and then immediately start writing notes? Or do you prefer to create the resource entry first and add notes later?

2. **Note-Taking Experience**: Since you mentioned Obsidian-like experience - do you want features like linking between notes (like [[Resource Name]] creating links), or are you thinking more like a simple markdown editor per resource?

3. **File Uploads**: For the related files (videos, transcripts), do you want to upload them directly to your platform, or would you prefer to store them elsewhere (Google Drive, Dropbox) and just link to them?

4. **Main Dashboard**: When you first open the site, what do you want to see? A list view of all resources, a grid of cards, or something else? And how important is search functionality to you?

5. **Mobile Usage**: Do you need this to work well on mobile, or is this primarily a desktop experience for you?

### User Answers:

- **Resource Creation Flow**: 
  - "I want it to be like this:"
  - "1. There's the button 'Add new resource'."
  - "2. It'll ask me to select which type of resource it is."
  - "3. Based on the type of resource, it'll open up a form with the correct fields."
  - "4. I'll fill them in, and it'll open up straight to that resource, so I can start immediately taking notes. That'll either immediately start taking notes or just leave and save it for later."

- **Auto-save Preference**: 
  - "I do want auto-save, so I don't have to worry about clicking the save button. But if that is a too large of a request, I don't mind clicking the save button every so often."

- **Note-Taking Requirements**: 
  - "For the note-taking experience, I just need a simple Markdown editing. It doesn't need to be super detailed with all the linking and stuff."
  - "I literally just need to be able to see the file and type in it and do basic Markdown things like headings and bullets. And number this. That's really really it."
  - "So something super simple which should be our pre-made libraries that handle all of this."

- **File Management**: 
  - "In addition for the file uploads I don't wanna- I will never be uploading files myself."
  - "The only file uploads I'll be handling will be for the short form content and for those I will take advantage of the free downloading APIs which I will provide them a link and then they- and then I'll make a call to the API which will download the video to whatever place I want."
  - "And then that way it'll download to the right place, it'll do all the processing, and then it'll store it in the proper location."
  - "So I'll never be actually uploading it as a user but the code will be handled on the back-end."
  - "Storage wise, I prefer to use one platform for storage where I can just store everything so something- maybe like something like Supabase but it'll depend on- it'll depend on how that goes."

- **Dashboard & Navigation**: 
  - "For the main dashboard, yeah- I just want a basic home page. I don't need anything fancy, just enough to be a main home page that takes me to the other pages that I need. To have all the functionality that I just talked about."
  - "I will need a separate page for each note, so each note will go to its own unique URL."

- **Mobile**: 
  - "And don't worry about mobile usage; I don't ever plan to use this on my phone."

---

## Question Round 3: Resource Types & Sharing Details

### Questions Asked:
1. **Resource Types & Fields**: You mentioned books, long-form videos, podcasts, and short-form content. What specific fields do you want for each type? For example:
   - Books: Title, Author, Publication Year, ISBN(?), Description(?)
   - Videos: Title, Creator/Channel, URL, Duration(?), Platform (YouTube/etc.)
   - What about podcasts and short-form content?

2. **Short-form Content APIs**: Which platforms are you planning to support for the automatic downloading? (TikTok, YouTube Shorts, Instagram Reels, etc.) This will help determine the API requirements.

3. **Sharing Workflow**: When you want to share something, do you want a "Share" button on each resource page, or do you prefer to manage all sharing from a central dashboard where you can see what's shared with whom?

4. **URL Structure**: For the unique URLs per note, do you care about the format? Something like `/resource/[id]` or `/notes/book-title-slug` or just random IDs?

5. **Tech Stack Preferences**: Any preference on the framework? Since you mentioned Vercel, are you thinking Next.js, or are you open to other options that deploy well there?

### User Answers:

- **Resource Fields**: 
  - "For the resource fields, just do your basic resource fields for each, but also clear the way to actually edit and update those resource fields. I want to add or remove one relatively easily."

- **Short-form APIs (Future Feature)**: 
  - "I will worry about the short from the company APIs for now. Let's add that in as a future feature plan."
  - "For now, let's just assume that I will paste in the transcript that it'll afford like any video form. I will paste in the transcript, it'll be one of the resources that will go okay, and put your transcript here, and then I'll paste it in, and it'll create that as a separate file from the next one."

- **Sharing Buttons**: 
  - "For the sharing workflow for the individual notes, needs to be a share button."
  - "And then to share the whole website and all, and like you know, having view everything, then there should also be a share button on the main page which allows me to share it with them."

- **URL Structure**: 
  - "Yeah dude, that URL structure is perfect. Whatever is most efficient and is easiest to implement for 5 whatever is the easiest for someone who's non-technical to build."
  - "Have little to no coding ability, so I need this to be as simple and as basic of a system while having all the features that I've described."

---

## Question Round 4: Final Clarifications

### Questions Asked:
1. **Resource Field Editing**: When you say "edit and update resource fields easily" - do you want an "Edit" button on each resource page that lets you modify the title, author, etc., or do you prefer this to be done from a separate management area?

2. **Transcript Storage**: For the transcript files you'll paste in - do you want these to appear as a separate tab/section on the resource page, or as a downloadable file link, or just as additional content within the main notes area?

3. **Authentication**: For your own access to manage the site - do you want a simple login system, or are you thinking something even simpler like a password-protected site?

### User Answers:

- **Field Configuration System**: 
  - "I meant like editing what research fields I have, and let's just make a page in the settings where I can say what resources I want to input for each form."
  - "It'll say the different types of resources I have and it'll say what fields are currently, and then I can either add more or remove them."
  - "For all of them, let's just make it a text box input basic."

- **Individual Resource Editing**: 
  - "And for the actual values of the resources editing after I've created a resource, there should be a button to add the resources to update the title or something like that, just in case I have typos or something like that."

- **File Structure Clarification**: 
  - "For the transcript files, let's just leave it all in the same one resource file."
  - "So for that resource, it would have one file where you know at the top it'll be the properties of the resource, then towards the bottom, at the very bottom, there will be a transcript. My notes will be in the middle."

- **Authentication Requirements**: 
  - "I want a super simple and basic authentication system."
  - "All I want for authentication is to put an email in and then just send a login link where when the user clicks it, it will authenticate their browser session. And that's it."
  - "Super simple, super easy. No passwords, no storage."

---

## Final Requirements Summary

### Core Platform Specifications:
- **Users**: Maximum 5 users (personal + friends)
- **Hosting**: Vercel free tier or similar
- **Complexity**: Super basic, non-technical friendly
- **Platform**: Desktop-only (no mobile optimization needed)

### Resource Types:
1. **Books** - Title, Author, Publication Year, Genre, Description
2. **Long-form Videos** - Title, Creator/Channel, URL, Duration, Platform, Description  
3. **Podcasts** - Title, Host, Episode Number, URL, Duration, Description
4. **Short-form Content** - Title, Creator, Platform, URL, Description

### File Structure (Single File Per Resource):
```
[TOP] Resource Properties (title, author, etc.)
[MIDDLE] User Notes (markdown editor)
[BOTTOM] Transcript (for video/audio content)
```

### Key Features:
- **Resource Creation**: Type selection → Dynamic form → Immediate note-taking
- **Customizable Fields**: Settings page to add/remove fields per resource type
- **Simple Markdown Editor**: Headers, bullets, numbered lists, basic formatting
- **Magic Link Authentication**: Email → Login link → Browser session
- **Granular Sharing**: Individual resources OR entire workspace
- **Access Levels**: Viewer (read-only) OR Editor (full permissions)
- **Auto-save**: Preferred but manual save acceptable if needed

### Future Features:
- Short-form content API integration (TikTok, YouTube Shorts, Instagram Reels)
- Advanced search and filtering
- Export functionality

### Technical Preferences:
- **Storage**: Single platform (Supabase recommended)
- **Framework**: Whatever is easiest for non-technical implementation
- **URL Structure**: `/resource/[id]` or simplest efficient option
- **Libraries**: Pre-made libraries for markdown editing and other features