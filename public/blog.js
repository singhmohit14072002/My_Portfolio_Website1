// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy3XA9106snUi-wBy-4ZzRs4FKiYkd-Tw",
  authDomain: "blog-f7eaa.firebaseapp.com",
  projectId: "blog-f7eaa",
  storageBucket: "blog-f7eaa.appspot.com",
  messagingSenderId: "921932902950",
  appId: "1:921932902950:web:07233af3a79a0e048dece7",
  measurementId: "G-GTBM92YH9V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authButtons = document.querySelector('.auth-buttons');
const userProfile = document.querySelector('.user-profile');
const userMenu = document.querySelector('.user-menu');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authModalTitle');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const nameGroup = document.getElementById('nameGroup');
const writePostBtn = document.getElementById('writePostBtn');
const blogPosts = document.getElementById('blogPosts');
const editorModal = document.getElementById('editorModal');
const postForm = document.getElementById('postForm');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const searchInput = document.getElementById('searchInput');

// Pagination variables
const postsPerPage = 9; // Number of posts per page
let lastVisiblePost = null; // To track the last post for the next page
let firstVisiblePost = null; // To track the first post for the previous page
let currentPage = 1;

// Global Variables
let currentUserData = null; // Initialize as null, fetch will populate

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        console.log("User signed in:", user.uid);
        if (authButtons) authButtons.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex'; // Show the profile area
        
        // Populate header avatar immediately
        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (userName) userName.textContent = user.displayName || user.email; // Fallback for header span if needed
        
        if (authModal) authModal.style.display = 'none';
        
        // Fetch current user's full data and populate dropdown
        fetchCurrentUserData(); 
        
    } else {
        // User is signed out
        console.log("User signed out");
        if (authButtons) authButtons.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none'; // Hide profile area
        currentUserData = null; // Clear user data on sign out
        // Hide dropdown if it was open
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('active');
    }
});

// Auth Modal Functions
function showAuthModal(type) {
    if (!authModal) {
        console.error("Auth modal not found");
        return;
    }
    
    authModal.style.display = 'flex';
    if (type === 'signup') {
        authTitle.textContent = 'Sign Up';
        authSubmit.textContent = 'Sign Up';
        nameGroup.style.display = 'flex';
    } else {
        authTitle.textContent = 'Sign In';
        authSubmit.textContent = 'Sign In';
        nameGroup.style.display = 'none';
    }
}

function closeAuthModal() {
    if (authModal) authModal.style.display = 'none';
}

function toggleAuthForm() {
    const isSignUp = authTitle.textContent === 'Sign In';
    showAuthModal(isSignUp ? 'signup' : 'signin');
}

// Auth Form Submission
if (authForm) {
    authForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name')?.value;
        const isSignUp = authTitle.textContent === 'Sign Up';

        if (isSignUp) {
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Signed up
                    const user = userCredential.user;
                    console.log("User created:", user);
                    
                    // Update profile with name if provided
                    if (name) {
                        user.updateProfile({
                            displayName: name
                        }).then(() => {
                            console.log("Profile updated with name:", name);
                        }).catch(error => {
                            console.error("Error updating profile:", error);
                        });
                    }
                    
                    closeAuthModal();
                })
                .catch(error => {
                    console.error("Sign up error:", error);
                    alert("Sign up failed: " + error.message);
                });
        } else {
            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Signed in
                    const user = userCredential.user;
                    console.log("User signed in:", user);
                    closeAuthModal();
                })
                .catch(error => {
                    console.error("Sign in error:", error);
                    alert("Sign in failed: " + error.message);
                });
        }
    });
}

// Editor Functions
function showEditor() {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (editorModal && postForm) {
        // Reset the form for a new post
        postForm.reset(); 
        delete postForm.dataset.postId; // Remove any existing post ID
        delete postForm.dataset.draftId; // Remove any existing draft ID
        
        // Ensure the publish button says "Publish Post"
        const publishButton = postForm.querySelector('.publish-post');
        if (publishButton) {
            publishButton.textContent = 'Publish Post';
            publishButton.disabled = false; // Ensure it's enabled
        }
        
        // Ensure the save draft button is standard
        const saveDraftButton = postForm.querySelector('.save-draft');
        if(saveDraftButton) {
            saveDraftButton.disabled = false;
            saveDraftButton.textContent = "Save as Draft";
        }

        editorModal.style.display = 'block';
    } else {
        console.error("Editor modal or post form not found");
    }
}

function closeEditor() {
    if (editorModal) {
        editorModal.style.display = 'none';
    }
}

// Save As Draft function
function saveAsDraft() {
    if (!auth.currentUser) {
        alert("You must be signed in to save a draft.");
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const tags = document.getElementById('postTags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
        
    if (!title && !content) {
        alert("Please add at least a title or content to save a draft.");
        return;
    }
    
    db.collection('drafts').add({
        title: title || "[No Title]",
        content: content || "",
        tags: tags,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert("Draft saved successfully!");
    })
    .catch(error => {
        console.error("Error saving draft:", error);
        alert("Error saving draft: " + error.message);
    });
}

// Show User Posts
function showUserPosts() {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    // Reset pagination when showing user posts
    currentPage = 1;
    lastVisiblePost = null;
    firstVisiblePost = null;
    if (prevPageBtn) prevPageBtn.style.display = 'none'; // Hide pagination buttons
    if (nextPageBtn) nextPageBtn.style.display = 'none';
    
    // Update UI to show loading state
    if (blogPosts) {
        blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading your posts...</div>';
        
        // Set active filter button
        document.querySelectorAll('.filter-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add a temporary page title to indicate we're viewing user posts
        const filterButtons = document.querySelector('.filter-buttons');
        if (filterButtons) {
            filterButtons.innerHTML = `
                <button class="filter-button active" data-filter="my-posts">My Posts</button>
                <button class="filter-button" data-filter="latest" onclick="loadPosts()">All Posts</button>
            `;
        }
        
        // Fetch user posts
        db.collection('posts')
            .where('authorId', '==', auth.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get()
            .then(snapshot => {
                blogPosts.innerHTML = '';
                
                if (snapshot.empty) {
                    blogPosts.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-pen-fancy"></i>
                            <h3>You haven't written any posts yet</h3>
                            <p>Your published posts will appear here.</p>
                            <button onclick="showEditor()" class="write-post-button">
                                <i class="fas fa-pen"></i> Write Your First Post
                            </button>
                        </div>
                    `;
                    return;
                }
                
                // Show user's posts
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(doc.id, post, true); // true = show edit/delete buttons
                    blogPosts.appendChild(postElement);
                });
                
                // Also fetch drafts if any
                fetchUserDrafts();
                
                // Re-show pagination section but keep buttons hidden initially
                const paginationSection = document.querySelector('.pagination');
                if (paginationSection) paginationSection.style.display = 'none'; 
            })
            .catch(error => {
                console.error("Error loading user posts:", error);
                blogPosts.innerHTML = `<div class="error">Failed to load your posts: ${error.message}</div>`;
            });
    }
}

// Fetch user drafts and display them
function fetchUserDrafts() {
    if (!auth.currentUser || !blogPosts) return;
    
    db.collection('drafts')
        .where('authorId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            if (snapshot.empty) return;
            
            // Create a drafts section
            const draftsSection = document.createElement('div');
            draftsSection.className = 'drafts-section';
            draftsSection.innerHTML = '<h3 class="section-title">Your Drafts</h3>';
            
            snapshot.forEach(doc => {
                const draft = doc.data();
                const draftElement = document.createElement('div');
                draftElement.className = 'blog-post draft';
                draftElement.dataset.draftId = doc.id;
                
                // Format date
                let formattedDate = 'Date not available';
                if (draft.createdAt) {
                    const date = draft.createdAt.toDate();
                    formattedDate = date.toLocaleDateString();
                }
                
                draftElement.innerHTML = `
                    <div class="post-header">
                        <h2>${draft.title || "Untitled Draft"}</h2>
                        <div class="post-meta">
                            <span class="date">${formattedDate}</span>
                            <span class="draft-label">Draft</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${draft.content ? draft.content.substring(0, 100) : "No content yet"}${draft.content && draft.content.length > 100 ? '...' : ''}</p>
                    </div>
                    <div class="post-footer">
                        <div class="post-actions">
                            <button class="action-button edit-draft" onclick="editDraft('${doc.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="action-button delete-draft" onclick="deleteDraft('${doc.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
                
                draftsSection.appendChild(draftElement);
            });
            
            // Add drafts section to the blog posts container
            blogPosts.appendChild(draftsSection);
        })
        .catch(error => {
            console.error("Error loading drafts:", error);
        });
}

// Create a post element
function createPostElement(postId, post, showControls = false) {
    const postElement = document.createElement('div');
    postElement.className = 'blog-post';
    postElement.dataset.postId = postId;
    
    let formattedDate = 'Date not available';
    if (post.createdAt) {
        formattedDate = post.createdAt.toDate().toLocaleDateString();
    }
    
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    
    let postControls = '';
    if (showControls) {
        postControls = `
            <div class="post-controls">
                <button class="action-button edit-post-btn" onclick="editPost('${postId}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="action-button delete-post-btn" onclick="deletePost('${postId}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
    }
    
    // Follow Button Logic (with null check)
    let followButtonHTML = '';
    if (auth.currentUser && post.authorId && auth.currentUser.uid !== post.authorId) {
        // Check if currentUserData and following array are ready
        const isFollowing = currentUserData && Array.isArray(currentUserData.following)
                            ? currentUserData.following.includes(post.authorId)
                            : false; // Default to false if not ready
        followButtonHTML = `
            <button class="action-button follow-button ${isFollowing ? 'following' : ''}" 
                    data-author-id="${post.authorId}" 
                    onclick="handleFollowClick(this, '${post.authorId}')">
                <i class="fas ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'}"></i> 
                ${isFollowing ? 'Unfollow' : 'Follow'}
            </button>
        `;
    }
    
    // Bookmark Button Logic (with null check)
    let bookmarkButtonHTML = '';
    if (auth.currentUser) {
        // Check if currentUserData and bookmarkedPosts array are ready
        const isBookmarked = currentUserData && Array.isArray(currentUserData.bookmarkedPosts)
                             ? currentUserData.bookmarkedPosts.includes(postId)
                             : false; // Default to false if not ready
        bookmarkButtonHTML = `
            <button class="action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}" 
                    data-post-id="${postId}" 
                    onclick="handleBookmarkClick(this, '${postId}')">
                <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                 ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </button>
        `;
    }
    
    postElement.innerHTML = `
        <div class="post-header">
            <div class="post-title-author">
                <h2>${escapeHTML(post.title)}</h2>
                <div class="post-meta">
                    <span class="author">${escapeHTML(post.authorName || 'Anonymous')}</span>
                    ${followButtonHTML}
                    <span class="date">${formattedDate}</span>
                </div>
            </div>
            ${postControls}
        </div>
        <div class="post-content">
             <p>${escapeHTML(post.content.substring(0, 200))}${post.content.length > 200 ? '...' : ''}</p>
            <a href="#" class="read-more" data-post-id="${postId}" onclick="showFullPost('${postId}'); return false;">Read More</a>
        </div>
        <div class="post-footer">
             <div class="post-tags">
                ${post.tags ? post.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') : ''}
            </div>
            <div class="post-actions">
                 ${bookmarkButtonHTML}
                 <button class="action-button like-button" data-post-id="${postId}" onclick="likePost('${postId}')"><i class="far fa-heart"></i> ${post.likes || 0}</button>
                 <button class="action-button comment-button" data-post-id="${postId}" onclick="showComments('${postId}')"><i class="far fa-comment"></i></button>
             </div>
        </div>
    `;
    
    // Add floating icons to the post
    addFloatingIcons(postElement, post);
    
    return postElement;
}

// Function to add floating icons to a post based on its content
function addFloatingIcons(container, post) {
    // Define possible icons based on common categories
    const iconsByCategory = {
        technology: ['💻', '🖥️', '📱', '⌨️', '🔌', '🔋', '📡'],
        design: ['🎨', '✏️', '📐', '📏', '🖌️', '🖍️'],
        business: ['📈', '📊', '💼', '🏢', '💰', '📝'],
        health: ['🏥', '💊', '🩺', '🧠', '🫀', '🦷'],
        food: ['🍕', '🍔', '🥗', '🍝', '🍰', '🍎'],
        travel: ['✈️', '🚆', '🚢', '🏖️', '🏞️', '🗺️'],
        education: ['📚', '🎓', '✏️', '📝', '🔬'],
        gaming: ['🎮', '🕹️', '👾', '🎲', '♟️'],
        generic: ['✨', '💡', '🔍', '📌', '🔖', '📎']
    };
    
    // Determine which category this post matches based on tags or title
    let relevantCategories = ['generic']; // Default
    
    if (post.tags && post.tags.length > 0) {
        // Check post tags against categories
        const lowerTags = post.tags.map(tag => tag.toLowerCase());
        
        Object.keys(iconsByCategory).forEach(category => {
            if (lowerTags.includes(category) || 
                post.title.toLowerCase().includes(category) ||
                (post.content && post.content.toLowerCase().includes(category))) {
                relevantCategories.push(category);
            }
        });
    }
    
    // Get unique categories
    relevantCategories = [...new Set(relevantCategories)];
    
    // Add 3-5 random icons from relevant categories
    const iconCount = Math.floor(Math.random() * 3) + 3; // 3 to 5 icons
    
    for (let i = 0; i < iconCount; i++) {
        // Pick a random category from relevant ones
        const category = relevantCategories[Math.floor(Math.random() * relevantCategories.length)];
        const icons = iconsByCategory[category];
        
        // Pick a random icon from the category
        const icon = icons[Math.floor(Math.random() * icons.length)];
        
        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.classList.add('post-icon');
        iconElement.textContent = icon;
        
        // Position randomly within the container
        iconElement.style.top = `${Math.random() * 80 + 10}%`; // 10-90%
        iconElement.style.left = `${Math.random() * 80 + 10}%`; // 10-90%
        
        // Add random size
        const size = Math.random() * 0.5 + 0.8; // 0.8-1.3em
        iconElement.style.fontSize = `${size}em`;
        
        // Add random animation delay
        iconElement.style.animationDelay = `${Math.random() * 5}s`;
        
        container.appendChild(iconElement);
    }
}

// Edit post function
function editPost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Post not found!');
                return;
            }
            
            const post = doc.data();
            
            // Populate the editor with post data
            document.getElementById('postTitle').value = post.title || '';
            document.getElementById('postContent').value = post.content || '';
            document.getElementById('postTags').value = post.tags ? post.tags.join(', ') : '';
            
            // Show the editor
            if (editorModal) {
                // Add post ID to the form for update reference
                postForm.dataset.postId = postId;
                
                // Change button text to reflect update rather than create
                const publishButton = postForm.querySelector('.publish-post');
                if (publishButton) {
                    publishButton.textContent = 'Update Post';
                }
                
                editorModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error loading post for edit:", error);
            alert('Failed to load post for editing. Please try again.');
        });
}

// Delete post function
function deletePost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
        db.collection('posts').doc(postId).delete()
            .then(() => {
                alert('Post deleted successfully!');
                showUserPosts(); // Refresh the posts
            })
            .catch(error => {
                console.error("Error deleting post:", error);
                alert('Failed to delete post. Please try again.');
            });
    }
}

// Edit draft function
function editDraft(draftId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    db.collection('drafts').doc(draftId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('Draft not found!');
                return;
            }
            
            const draft = doc.data();
            
            // Populate the editor with draft data
            document.getElementById('postTitle').value = draft.title || '';
            document.getElementById('postContent').value = draft.content || '';
            document.getElementById('postTags').value = draft.tags ? draft.tags.join(', ') : '';
            
            // Show the editor
            if (editorModal) {
                // Add draft ID to the form for reference
                postForm.dataset.draftId = draftId;
                
                // Ensure the publish button is visible
                const publishButton = postForm.querySelector('.publish-post');
                if (publishButton) {
                    publishButton.style.display = 'block';
                    publishButton.textContent = 'Publish';
                }
                
                editorModal.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error loading draft for edit:", error);
            alert('Failed to load draft for editing. Please try again.');
        });
}

// Delete draft function
function deleteDraft(draftId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
        db.collection('drafts').doc(draftId).delete()
            .then(() => {
                alert('Draft deleted successfully!');
                showUserPosts(); // Refresh the posts
            })
            .catch(error => {
                console.error("Error deleting draft:", error);
                alert('Failed to delete draft. Please try again.');
            });
    }
}

// Post Form Submission (with update capabilities)
if (postForm) {
    postForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!auth.currentUser) {
            alert("You must be signed in to publish a post.");
            return;
        }
        
        const title = document.getElementById('postTitle').value;
        const content = document.getElementById('postContent').value;
        const tags = document.getElementById('postTags').value
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
            
        if (!title || !content) {
            alert("Please fill in both title and content.");
            return;
        }
        
        const publishButton = document.querySelector('.publish-post');
        publishButton.disabled = true;
        publishButton.textContent = "Publishing...";
        
        // Check if we're updating an existing post
        const postId = postForm.dataset.postId;
        const draftId = postForm.dataset.draftId;
        
        let savePromise;
        
        if (postId) {
            // Update existing post
            savePromise = db.collection('posts').doc(postId).update({
                title: title,
                content: content,
                tags: tags,
                lastEdited: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // New post
            savePromise = db.collection('posts').add({
                title: title,
                content: content,
                tags: tags,
                authorId: auth.currentUser.uid,
                authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                views: 0
            });
        }
        
        savePromise
            .then(() => {
                // If we published from a draft, delete the draft
                if (draftId) {
                    return db.collection('drafts').doc(draftId).delete();
                }
                return Promise.resolve();
            })
            .then(() => {
                alert(postId ? "Post updated successfully!" : "Post published successfully!");
                postForm.reset();
                // Reset the form data attributes
                delete postForm.dataset.postId;
                delete postForm.dataset.draftId;
                closeEditor();
                
                // Reset publish button text
                publishButton.textContent = "Publish Post";
                
                // Refresh the posts list
                if (postId) {
                    showUserPosts(); // If we were editing, we're likely in the My Posts view
                } else {
                    loadPosts();
                }
            })
            .catch(error => {
                console.error("Error saving post:", error);
                alert("Error: " + error.message);
            })
            .finally(() => {
                publishButton.disabled = false;
                publishButton.textContent = postId ? "Update Post" : "Publish Post";
            });
    });
}

// Load Posts (with pagination)
function loadPosts(direction = 'first') {
    if (!blogPosts || !prevPageBtn || !nextPageBtn) {
        console.error("Required elements for loading posts not found");
        return;
    }
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading posts...</div>';
    
    let queryRef = db.collection('posts').orderBy('createdAt', 'desc');
    
    // Build query based on direction
    if (direction === 'next' && lastVisiblePost) {
        queryRef = queryRef.startAfter(lastVisiblePost);
        currentPage++;
    } else if (direction === 'prev' && firstVisiblePost) {
        // Firestore doesn't easily support paginating backwards with 'desc' order.
        // A common workaround is fetching *before* the first visible, ordered ascending, 
        // then reversing the result. Or query descending ending before the first.
        queryRef = queryRef.endBefore(firstVisiblePost).limitToLast(postsPerPage);
        currentPage--;
    } else {
        // First page
        currentPage = 1;
        lastVisiblePost = null;
        firstVisiblePost = null;
        queryRef = queryRef.limit(postsPerPage);
    }
    
    // For 'prev', we use limitToLast. For 'first'/'next', use limit.
    if (direction !== 'prev') {
        queryRef = queryRef.limit(postsPerPage);
    }

    queryRef.get()
        .then(snapshot => {
            blogPosts.innerHTML = ''; // Clear loading/previous posts
            
            if (snapshot.empty) {
                if (currentPage === 1) {
                    blogPosts.innerHTML = '<p>No posts found. Be the first to write one!</p>';
                }
                // If not first page and empty, it means we went past the last page
                nextPageBtn.disabled = true; 
            } else {
                // Get the actual documents
                const docs = snapshot.docs;
                
                // Store the first and last visible documents for pagination
                firstVisiblePost = docs[0];
                lastVisiblePost = docs[docs.length - 1];
                
                // Display posts
                docs.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(doc.id, post);
                    blogPosts.appendChild(postElement);
                });
                
                // Update button states
                // Disable next if fewer posts were fetched than the limit
                nextPageBtn.disabled = docs.length < postsPerPage;
            }
            
            // Disable previous if we are on page 1
            prevPageBtn.disabled = currentPage <= 1;
            
            // Reset filters if we navigated back to all posts
            if(document.querySelector('[data-filter="my-posts"]')) {
                 const filterButtons = document.querySelector('.filter-buttons');
                 filterButtons.innerHTML = `
                    <button class="filter-button" data-filter="my-posts" onclick="showUserPosts()">My Posts</button>
                    <button class="filter-button active" data-filter="latest">Latest</button>
                 `;
            }
        })
        .catch(error => {
            console.error("Error loading posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load posts: ${error.message}</div>`;
        });
}

// Sign Out Function
function signOut() {
    auth.signOut()
        .then(() => {
            console.log("User signed out successfully");
        })
        .catch(error => {
            console.error("Sign out error:", error);
        });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search Posts Function
function searchPosts(searchTerm) {
    if (!blogPosts || !prevPageBtn || !nextPageBtn) {
        console.error("Required elements for search not found");
        return;
    }
    
    // Trim search term
    searchTerm = searchTerm.trim();
    
    // If search term is empty, load default posts
    if (searchTerm === '') {
        loadPosts('first');
        // Re-enable pagination if it was disabled
        const paginationSection = document.querySelector('.pagination');
        if(paginationSection) paginationSection.style.display = 'flex';
        return;
    }
    
    console.log(`Searching for posts starting with: ${searchTerm}`);
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Searching posts...</div>';
    
    // Disable pagination during search
    const paginationSection = document.querySelector('.pagination');
    if(paginationSection) paginationSection.style.display = 'none';
    
    // Firestore prefix search query
    // Note: Case-sensitive. For case-insensitive, you'd need to store lowercase versions.
    db.collection('posts')
        .orderBy('title') // Order by the field we are querying
        .startAt(searchTerm)
        .endAt(searchTerm + '\uf8ff') // \uf8ff is a high Unicode character for range matching
        // .limit(10) // Optionally limit search results
        .get()
        .then(snapshot => {
            blogPosts.innerHTML = ''; // Clear loading/previous posts
            
            if (snapshot.empty) {
                blogPosts.innerHTML = `<p>No posts found matching "${escapeHTML(searchTerm)}".</p>`;
            } else {
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const postElement = createPostElement(doc.id, post);
                    blogPosts.appendChild(postElement);
                });
            }
        })
        .catch(error => {
            console.error("Error searching posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to search posts: ${error.message}</div>`;
        });
}

// Debounced search handler
const debouncedSearch = debounce(searchPosts, 400); // Wait 400ms after user stops typing

// Function to create and animate floating icons
function createFloatingDevOpsIcons() {
    const container = document.querySelector('.floating-icons-container');
    if (!container) return;

    // DevOps related icons (mix of brands and solid/regular)
    const icons = [
        { class: 'fa-docker', type: 'fab' }, 
        { class: 'fa-kubernetes', type: 'fab' }, 
        { class: 'fa-git-alt', type: 'fab' }, 
        { class: 'fa-aws', type: 'fab' }, 
        { class: 'fa-linux', type: 'fab' }, 
        { class: 'fa-windows', type: 'fab' }, 
        { class: 'fa-server', type: 'fas' }, 
        { class: 'fa-cloud', type: 'fas' }, 
        { class: 'fa-code-branch', type: 'fas' }, 
        { class: 'fa-cogs', type: 'fas' }, 
        { class: 'fa-terminal', type: 'fas' },
        { class: 'fa-database', type: 'fas' },
        { class: 'fa-network-wired', type: 'fas' },
        { class: 'fa-cloud-upload-alt', type: 'fas' },
        { class: 'fa-cloud-download-alt', type: 'fas' },
        { class: 'fa-microchip', type: 'fas' },
        { class: 'fa-sitemap', type: 'fas' },
        { class: 'fa-code', type: 'fas' },
        { class: 'fa-github', type: 'fab' },
        { class: 'fa-gitlab', type: 'fab' },
        { class: 'fa-jenkins', type: 'fab' },
        { class: 'fa-jira', type: 'fab' },
        { class: 'fa-digital-ocean', type: 'fab' }
    ];
    
    // Array of colors for variety (blues and teals)
    const colors = [
        'rgba(41, 98, 255, 0.3)',    // Primary blue
        'rgba(0, 119, 182, 0.3)',    // Alternative blue
        'rgba(0, 150, 199, 0.3)',    // Lighter blue
        'rgba(23, 162, 184, 0.3)',   // Teal
        'rgba(72, 202, 228, 0.3)'    // Light teal
    ];
    
    const numberOfIcons = 25; // Increased from 15 to 25

    for (let i = 0; i < numberOfIcons; i++) {
        const iconData = icons[Math.floor(Math.random() * icons.length)];
        const iconElement = document.createElement('i');
        
        // Add Font Awesome base class, specific type (fab/fas), icon class, and our custom class
        iconElement.classList.add(iconData.type, iconData.class, 'floating-icon');
        
        // Random color from our color palette
        const color = colors[Math.floor(Math.random() * colors.length)];
        iconElement.style.color = color;
        
        // Random initial position - distribute more evenly across the screen
        // Use grid-based positioning to avoid clustering
        const row = Math.floor(i / 5);  // 5 icons per row
        const col = i % 5;              // 5 columns
        
        // Add some randomness within the grid cell
        const randomOffset = 5;
        const startTop = (row * 20) + (Math.random() * randomOffset);      // 0-100% vertical in 5 rows
        const startLeft = (col * 20) + (Math.random() * randomOffset);     // 0-100% horizontal in 5 columns
        
        iconElement.style.top = `${startTop}%`;
        iconElement.style.left = `${startLeft}%`;

        // Varying sizes for more visual interest
        const sizeVariation = Math.random() * 2 + 1; // 1-3 multiplier
        iconElement.style.fontSize = `${sizeVariation * 3}rem`; // 3-9rem
        
        // Random animation duration and delay
        const duration = Math.random() * 10 + 20; // 20-30s for slower, more visible movement
        const delay = Math.random() * 10;         // 0-10s delay
        iconElement.style.animationDuration = `${duration}s`;
        iconElement.style.animationDelay = `${delay}s`;

        container.appendChild(iconElement);
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    console.log("Document loaded. Initializing...");
    
    // Initial check/fetch of user data happens in onAuthStateChanged
    // Initial post load
    loadPosts('first'); 
    
    // Create floating icons
    createFloatingDevOpsIcons();
    
    // Add listeners for pagination buttons
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => loadPosts('prev'));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => loadPosts('next'));
    }
    
    // Add listener for search input
    if (searchInput) {
        // Re-enable search input (might have been disabled on other pages)
        searchInput.disabled = false; 
        searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    } else {
        console.warn("Search input not found");
    }
});

// Show full post (with null check for bookmark)
function showFullPost(postId) {
    if (!blogPosts) return;
    
    // Show loading state
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading post...</div>';
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) {
                blogPosts.innerHTML = '<div class="error">Post not found!</div>';
                return;
            }
            
            const post = doc.data();
            
            // Update view count
            db.collection('posts').doc(postId).update({
                views: firebase.firestore.FieldValue.increment(1)
            }).catch(error => console.error("Error updating view count:", error));
            
            // Create full post view
            blogPosts.innerHTML = '';
            
            const fullPostElement = document.createElement('div');
            fullPostElement.className = 'full-post';
            
            // Format date
            let formattedDate = 'Date not available';
            if (post.createdAt) {
                const date = post.createdAt.toDate();
                formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            }
            
            // Basic HTML escape function
            function escapeHTML(str) {
                if (!str) return '';
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }
            
            // Check if current user is author
            const isAuthor = auth.currentUser && post.authorId === auth.currentUser.uid;
            
            // Add to Reading History
            addToReadingHistory(postId);
            
            // Add bookmark button to full post view as well (with null check)
            let bookmarkButtonFullHTML = '';
            if (auth.currentUser) {
                // Check if currentUserData and bookmarkedPosts array are ready
                const isBookmarked = currentUserData && Array.isArray(currentUserData.bookmarkedPosts)
                                     ? currentUserData.bookmarkedPosts.includes(postId)
                                     : false; // Default to false if not ready
                bookmarkButtonFullHTML = `
                    <button class="action-button bookmark-button ${isBookmarked ? 'bookmarked' : ''}" 
                            data-post-id="${postId}" 
                            onclick="handleBookmarkClick(this, '${postId}')">
                        <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                        ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
                    </button>
                `;
            }
            
            fullPostElement.innerHTML = `
                <div class="post-header">
                    <h1 class="post-title">${escapeHTML(post.title)}</h1>
                    <div class="post-meta">
                        <span class="author">${escapeHTML(post.authorName || 'Anonymous')}</span>
                        <span class="date">${formattedDate}</span>
                        <span class="views"><i class="fas fa-eye"></i> ${post.views || 0}</span>
                    </div>
                    ${isAuthor ? `
                    <div class="post-controls">
                        <button class="action-button edit-post-btn" onclick="editPost('${postId}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="action-button delete-post-btn" onclick="deletePost('${postId}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                    ` : ''}
                </div>
                <div class="post-content-full">
                    ${post.content.split('\n').map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('')}
                </div>
                <div class="post-footer">
                    <div class="post-tags">
                        ${post.tags ? post.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('') : ''}
                    </div>
                    <div class="post-actions">
                        ${bookmarkButtonFullHTML}
                        <button class="action-button like-button ${post.likedBy && post.likedBy.includes(auth.currentUser?.uid) ? 'liked' : ''}" 
                                onclick="likePost('${postId}')">
                            <i class="${post.likedBy && post.likedBy.includes(auth.currentUser?.uid) ? 'fas' : 'far'} fa-heart"></i> ${post.likes || 0}
                        </button>
                        <button class="action-button comment-button" onclick="showComments('${postId}')">
                            <i class="far fa-comment"></i> Comments
                        </button>
                    </div>
                </div>
                <div class="back-button" onclick="loadPosts('first')">
                    <i class="fas fa-arrow-left"></i> Back to Posts
                </div>
                <div id="commentsSection" class="comments-section"></div>
            `;
            
            blogPosts.appendChild(fullPostElement);
            
            // Load comments for the post
            showComments(postId);
        })
        .catch(error => {
            console.error("Error loading post:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load post: ${error.message}</div>`;
        });
}

// Like post function
function likePost(postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    const userId = auth.currentUser.uid;
    
    db.collection('posts').doc(postId).get()
        .then(doc => {
            if (!doc.exists) return;
            
            const post = doc.data();
            const likedBy = post.likedBy || [];
            const isLiked = likedBy.includes(userId);
            
            if (isLiked) {
                // Unlike post
                return db.collection('posts').doc(postId).update({
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedBy: firebase.firestore.FieldValue.arrayRemove(userId)
                });
            } else {
                // Like post
                return db.collection('posts').doc(postId).update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(userId)
                });
            }
        })
        .then(() => {
            // Refresh the current view
            const fullPostElement = document.querySelector('.full-post');
            if (fullPostElement) {
                // We're in full post view, refresh
                showFullPost(postId);
            } else {
                // We're in list view
                const likeButton = document.querySelector(`.like-button[data-post-id="${postId}"]`);
                if (likeButton) {
                    // Update UI directly without reloading
                    db.collection('posts').doc(postId).get()
                        .then(doc => {
                            if (!doc.exists) return;
                            const post = doc.data();
                            const likedBy = post.likedBy || [];
                            const isLiked = likedBy.includes(userId);
                            
                            likeButton.innerHTML = `
                                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> ${post.likes || 0}
                            `;
                            
                            if (isLiked) {
                                likeButton.classList.add('liked');
                            } else {
                                likeButton.classList.remove('liked');
                            }
                        });
                }
            }
        })
        .catch(error => {
            console.error("Error updating post like:", error);
        });
}

// Show comments for a post
function showComments(postId) {
    const commentsSection = document.getElementById('commentsSection');
    if (!commentsSection) return;
    
    commentsSection.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>';
    
    db.collection('posts').doc(postId).collection('comments')
        .orderBy('createdAt', 'desc')
        .get()
        .then(snapshot => {
            commentsSection.innerHTML = `
                <h3 class="comments-title">Comments</h3>
                <div class="comments-list">
                    ${snapshot.empty ? '<p class="no-comments">No comments yet. Be the first to comment!</p>' : ''}
                </div>
                <div class="comment-form-container">
                    <form id="commentForm" class="comment-form">
                        <textarea id="commentContent" placeholder="Write your comment..." required></textarea>
                        <button type="submit" class="post-comment-btn">Post Comment</button>
                    </form>
                </div>
            `;
            
            const commentsList = commentsSection.querySelector('.comments-list');
            
            snapshot.forEach(doc => {
                const comment = doc.data();
                const commentElement = document.createElement('div');
                commentElement.className = 'comment';
                
                // Format date
                let formattedDate = 'Date not available';
                if (comment.createdAt) {
                    const date = comment.createdAt.toDate();
                    formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                }
                
                // Basic HTML escape function
                function escapeHTML(str) {
                    if (!str) return '';
                    return str
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }
                
                commentElement.innerHTML = `
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(comment.authorName || 'Anonymous')}</span>
                        <span class="comment-date">${formattedDate}</span>
                    </div>
                    <div class="comment-content">
                        ${escapeHTML(comment.content)}
                    </div>
                `;
                
                commentsList.appendChild(commentElement);
            });
            
            // Add event listener to comment form
            const commentForm = document.getElementById('commentForm');
            commentForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                if (!auth.currentUser) {
                    showAuthModal('signin');
                    return;
                }
                
                const content = document.getElementById('commentContent').value;
                if (!content.trim()) return;
                
                const submitButton = commentForm.querySelector('.post-comment-btn');
                submitButton.disabled = true;
                submitButton.textContent = 'Posting...';
                
                db.collection('posts').doc(postId).collection('comments').add({
                    content: content,
                    authorId: auth.currentUser.uid,
                    authorName: auth.currentUser.displayName || auth.currentUser.email || 'Anonymous',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    // Refresh comments
                    showComments(postId);
                })
                .catch(error => {
                    console.error("Error adding comment:", error);
                    alert("Failed to post comment: " + error.message);
                    submitButton.disabled = false;
                    submitButton.textContent = 'Post Comment';
                });
            });
        })
        .catch(error => {
            console.error("Error loading comments:", error);
            commentsSection.innerHTML = `<div class="error">Failed to load comments: ${error.message}</div>`;
        });
}

// Fetch Current User Data
function fetchCurrentUserData() {
    if (!auth.currentUser) {
        currentUserData = null;
        return Promise.reject("No user logged in"); 
    }
    const user = auth.currentUser;
    const userId = user.uid;
    const userDocRef = db.collection('users').doc(userId);
    
    console.log("Fetching/Ensuring user data for:", userId);
    
    // Populate dropdown with basic info immediately
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserHandle = document.getElementById('dropdownUserHandle');
    const dropdownUserAvatar = document.getElementById('dropdownUserAvatar');
    if (dropdownUserName) dropdownUserName.textContent = user.displayName || 'User Name';
    if (dropdownUserHandle) dropdownUserHandle.textContent = `@${user.email ? user.email.split('@')[0] : 'username'}`;
    if (dropdownUserAvatar) dropdownUserAvatar.src = user.photoURL || 'https://via.placeholder.com/48';
    if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';

    return userDocRef.get().then(doc => {
        if (doc.exists) {
            console.log("User document exists.");
            const data = doc.data();
            currentUserData = {
                displayName: data.displayName || user.displayName || 'Anonymous',
                email: data.email || user.email,
                photoURL: data.photoURL || user.photoURL || '',
                handle: data.handle, 
                following: Array.isArray(data.following) ? data.following : [],
                bookmarkedPosts: Array.isArray(data.bookmarkedPosts) ? data.bookmarkedPosts : [],
                readingHistory: Array.isArray(data.readingHistory) ? data.readingHistory : [],
                createdAt: data.createdAt 
            };
            console.log("Current user data loaded:", currentUserData);
            return currentUserData;
        } else {
            console.log("User document not found - creating:", userId);
            const newUserDocData = {
                 displayName: user.displayName || 'Anonymous User',
                 email: user.email,
                 photoURL: user.photoURL || '',
                 following: [],
                 bookmarkedPosts: [], 
                 readingHistory: [], 
                 createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return userDocRef.set(newUserDocData).then(() => {
                 console.log("Created user document for", userId);
                 // Initialize local data *after* creation, ensuring arrays match
                 currentUserData = {
                     ...newUserDocData,
                     createdAt: new Date() // Approximate timestamp locally
                 }; 
                 return currentUserData;
             }).catch(err => {
                 console.error("Error creating user doc:", err);
                 currentUserData = null;
                 throw err; 
             });
        }
    }).catch(error => {
        console.error("Error fetching/creating user data:", error);
        currentUserData = null;
        throw error;
    });
}

// Handle Follow/Unfollow Click
function handleFollowClick(buttonElement, authorIdToFollow) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    if (currentUserId === authorIdToFollow) return; // Cannot follow self
    
    const userDocRef = db.collection('users').doc(currentUserId);
    const isCurrentlyFollowing = currentUserData.following.includes(authorIdToFollow);
    
    let updateAction;
    if (isCurrentlyFollowing) {
        // Unfollow
        updateAction = firebase.firestore.FieldValue.arrayRemove(authorIdToFollow);
        console.log(`Attempting to unfollow: ${authorIdToFollow}`);
    } else {
        // Follow
        updateAction = firebase.firestore.FieldValue.arrayUnion(authorIdToFollow);
        console.log(`Attempting to follow: ${authorIdToFollow}`);
    }
    
    // Disable button during update
    buttonElement.disabled = true;
    
    userDocRef.update({ following: updateAction })
        .then(() => {
            console.log("Follow status updated successfully");
            // Update local state
            if (isCurrentlyFollowing) {
                currentUserData.following = currentUserData.following.filter(id => id !== authorIdToFollow);
            } else {
                currentUserData.following.push(authorIdToFollow);
            }
            // Update button appearance immediately
            updateFollowButtonUI(buttonElement, authorIdToFollow, !isCurrentlyFollowing);
        })
        .catch(error => {
            console.error("Error updating follow status:", error);
            alert("Could not update follow status. Please try again.");
        })
        .finally(() => {
            buttonElement.disabled = false; // Re-enable button
        });
}

// Helper to Update Button UI
function updateFollowButtonUI(buttonElement, authorId, isFollowing) {
     if (!buttonElement) return;
     buttonElement.textContent = isFollowing ? ' Unfollow' : ' Follow';
     buttonElement.innerHTML = `<i class="fas ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'}"></i>` + buttonElement.textContent;
     if (isFollowing) {
         buttonElement.classList.add('following');
     } else {
         buttonElement.classList.remove('following');
     }
}

// Toggle Profile Dropdown
function toggleProfileDropdown(event) {
    event.stopPropagation(); // Prevent click from bubbling up to window
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Close Dropdown on Outside Click
window.addEventListener('click', (event) => {
    const dropdown = document.getElementById('profileDropdown');
    const trigger = document.querySelector('.user-menu-trigger');
    // Close if click is outside the dropdown and not on the trigger
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(event.target) && !trigger.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// Placeholder Functions for New Links
function showBookmarks() {
    if (!auth.currentUser) { showAuthModal('signin'); return; }
    if (!blogPosts) return;
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading bookmarks...</div>';
    hidePaginationAndFilters(); // Helper function to hide common elements

    const bookmarkedIds = currentUserData.bookmarkedPosts;
    
    if (!bookmarkedIds || bookmarkedIds.length === 0) {
        blogPosts.innerHTML = '<div class="empty-state"><i class="far fa-bookmark"></i><h3>No Bookmarks Yet</h3><p>Click the bookmark icon on posts to save them here.</p></div>';
        return;
    }
    
    // Fetch bookmarked posts
    // Using multiple gets for simplicity, consider 'in' query for < 30 bookmarks
    const promises = bookmarkedIds.map(id => db.collection('posts').doc(id).get());
    
    Promise.all(promises)
        .then(docs => {
            blogPosts.innerHTML = ''; // Clear loading
             docs.forEach(doc => {
                 if (doc.exists) {
                     const post = doc.data();
                     const postElement = createPostElement(doc.id, post);
                     blogPosts.appendChild(postElement);
                 } else {
                      console.warn(`Bookmarked post with ID ${doc.id} not found.`);
                 }
             });
             if(blogPosts.children.length === 0) {
                  blogPosts.innerHTML = '<p>Could not load bookmarked posts (they may have been deleted).</p>';
             }
        })
        .catch(error => {
            console.error("Error fetching bookmarked posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load bookmarks: ${error.message}</div>`;
        });
}

function showReadingHistory() {
    if (!auth.currentUser) { showAuthModal('signin'); return; }
    if (!blogPosts) return;
    
    blogPosts.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading reading history...</div>';
    hidePaginationAndFilters();

    const historyIds = currentUserData.readingHistory;
    
    if (!historyIds || historyIds.length === 0) {
        blogPosts.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><h3>No Reading History</h3><p>Posts you read will appear here.</p></div>';
        return;
    }
    
    // Fetch history posts - need to maintain order!
    // Fetch one by one to preserve order easily.
    blogPosts.innerHTML = ''; // Clear loading
    let postsFound = 0;
    Promise.all(historyIds.map(id => db.collection('posts').doc(id).get()))
        .then(docs => {
             docs.forEach(doc => {
                  if (doc.exists) {
                     postsFound++;
                     const post = doc.data();
                     const postElement = createPostElement(doc.id, post);
                     blogPosts.appendChild(postElement);
                  } else {
                     console.warn(`History post with ID ${doc.id} not found.`);
                  }
             });
             if (postsFound === 0) {
                 blogPosts.innerHTML = '<p>Could not load posts from history (they may have been deleted).</p>';
             }
        })
        .catch(error => {
            console.error("Error fetching history posts:", error);
            blogPosts.innerHTML = `<div class="error">Failed to load reading history: ${error.message}</div>`;
        });
}

// Helper to Hide Pagination/Filters
function hidePaginationAndFilters() {
     const paginationSection = document.querySelector('.pagination');
     const filterButtons = document.querySelector('.filter-buttons');
     if(paginationSection) paginationSection.style.display = 'none';
     if(filterButtons) filterButtons.style.display = 'none';
}

// Handle Bookmark Click (with detailed logging)
function handleBookmarkClick(buttonElement, postId) {
    if (!auth.currentUser) {
        showAuthModal('signin');
        return;
    }
    if (!currentUserData) {
        alert("User data not loaded yet. Please wait and try again.");
        console.error("handleBookmarkClick called before currentUserData was loaded.");
        return;
    }
    
    const currentUserId = auth.currentUser.uid;
    const userDocRef = db.collection('users').doc(currentUserId);
    
    // Ensure local array exists before checking includes
    const localBookmarks = Array.isArray(currentUserData.bookmarkedPosts) ? currentUserData.bookmarkedPosts : [];
    const isCurrentlyBookmarked = localBookmarks.includes(postId);
    
    let updateAction;
    let updateData = {};

    if (isCurrentlyBookmarked) {
        updateAction = firebase.firestore.FieldValue.arrayRemove(postId);
        updateData = { bookmarkedPosts: updateAction };
        console.log(`Attempting to UNBOOKMARK: User=${currentUserId}, Post=${postId}`);
    } else {
        updateAction = firebase.firestore.FieldValue.arrayUnion(postId);
        updateData = { bookmarkedPosts: updateAction };
        console.log(`Attempting to BOOKMARK: User=${currentUserId}, Post=${postId}`);
    }
    
    console.log("Firestore update object:", updateData);
    buttonElement.disabled = true; 
    
    // Perform the update
    userDocRef.update(updateData)
        .then(() => {
            console.log("Firestore update successful for bookmark status.");
            // Update local state *after* successful Firestore update
            if (isCurrentlyBookmarked) {
                // Use the validated local array
                currentUserData.bookmarkedPosts = localBookmarks.filter(id => id !== postId);
            } else {
                // Push to the validated local array
                currentUserData.bookmarkedPosts = [...localBookmarks, postId]; // Ensure it's added correctly
            }
            console.log("Local bookmark data updated:", currentUserData.bookmarkedPosts);
            // Update button UI
            updateBookmarkButtonUI(buttonElement, !isCurrentlyBookmarked);
            const otherButtonSelector = document.querySelector(`.bookmark-button[data-post-id="${postId}"]:not([disabled])`);
            if(otherButtonSelector) updateBookmarkButtonUI(otherButtonSelector, !isCurrentlyBookmarked);
        })
        .catch(error => {
            console.error(`Error updating bookmark status for post ${postId}:`, error); // Log the specific error object
            // Provide more specific error feedback
            let userMessage = "Could not update bookmark status. Please try again.";
            if (error.code === 'permission-denied') {
                 userMessage = "Permission denied. Check Firestore rules.";
            } else if (error.code === 'not-found') {
                 userMessage = "User document not found. Cannot update bookmark.";
            } else {
                 userMessage = `Could not update bookmark status. Error: ${error.code || error.message}`; // Include error code
            }
            alert(userMessage);
        })
        .finally(() => {
            buttonElement.disabled = false; 
        });
}

// Helper to Update Bookmark Button UI
function updateBookmarkButtonUI(buttonElement, isBookmarked) {
     if (!buttonElement) return;
     buttonElement.innerHTML = `
         <i class="${isBookmarked ? 'fas' : 'far'} fa-bookmark"></i> 
         ${isBookmarked ? 'Bookmarked' : 'Bookmark'}
     `;
     if (isBookmarked) {
         buttonElement.classList.add('bookmarked');
     } else {
         buttonElement.classList.remove('bookmarked');
     }
}

// Add to Reading History
const READING_HISTORY_LIMIT = 50; // Max posts to keep in history
function addToReadingHistory(postId) {
    if (!auth.currentUser || !postId) return;
    // Ensure user data is available before attempting transaction
    if (!currentUserData) {
         console.warn("addToReadingHistory skipped: currentUserData not loaded.");
         return;
    }

    const currentUserId = auth.currentUser.uid;
    const userDocRef = db.collection('users').doc(currentUserId);
    
    // Use the locally available history for optimistic check, transaction handles consistency
    let history = currentUserData.readingHistory || [];
    // Check if update is even needed (already at the front)
    if (history.length > 0 && history[0] === postId) {
        // console.log("Post already at front of reading history.");
        return; 
    }

    // Proceed with transaction
    db.runTransaction(transaction => {
        return transaction.get(userDocRef).then(doc => {
            // Re-fetch within transaction for consistency
            if (!doc.exists) throw "User document does not exist!"; 
            const data = doc.data();
            let currentHistory = data.readingHistory || []; 
            currentHistory = currentHistory.filter(id => id !== postId);
            currentHistory.unshift(postId);
            if (currentHistory.length > READING_HISTORY_LIMIT) {
                currentHistory = currentHistory.slice(0, READING_HISTORY_LIMIT);
            }
            transaction.update(userDocRef, { readingHistory: currentHistory });
            return currentHistory; // Return new history to update local state
        });
    }).then((newHistory) => {
        console.log(`Added/updated post ${postId} in reading history.`);
        // Update local data AFTER successful transaction
        currentUserData.readingHistory = newHistory;
    }).catch(error => {
        console.error("Error updating reading history transaction:", error);
    });
}

// Show Account Settings
function showAccountSettings() {
    alert("Account Settings feature coming soon!");
}

// Show Changelog
function showChangelog() {
    alert("Changelog feature coming soon!");
}

// Show Support
function showSupport() {
    alert("Support & Feedback feature coming soon!");
}

// Add scroll listener for header animation
window.addEventListener('scroll', function() {
    const header = document.querySelector('.main-header');
    if (window.scrollY > 50) { // Add shadow after scrolling 50px
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});
