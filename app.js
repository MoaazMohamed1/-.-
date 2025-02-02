let db;
const request = indexedDB.open("SocialPlatformDB", 1);

request.onupgradeneeded = (event) => {
  db = event.target.result;
  if (!db.objectStoreNames.contains("posts")) {
    db.createObjectStore("posts", { keyPath: "id" });
  }
};

request.onsuccess = (event) => {
  db = event.target.result;
  loadPostsFromIndexedDB();
};

request.onerror = (event) => {
  console.error("Database error:", event.target.errorCode);
};

const contentInput = document.getElementById("content-input");
const fileInput = document.getElementById("file-input");
const linkInput = document.getElementById("link-input");
const descriptionInput = document.getElementById("description-input"); // حقل الوصف
const addPostButton = document.getElementById("add-post-button");
const postList = document.getElementById("post-list");
let postToDelete = null;
let postToEdit = null;

function savePostToIndexedDB(post) {
  const transaction = db.transaction("posts", "readwrite");
  const store = transaction.objectStore("posts");
  store.put(post);
}

function loadPostsFromIndexedDB() {
  const transaction = db.transaction("posts", "readonly");
  const store = transaction.objectStore("posts");
  const request = store.getAll();

  request.onsuccess = () => {
    const posts = request.result;
    postList.innerHTML = '';
    posts.forEach(post => createPostElement(post));
  };

  request.onerror = () => {
    console.error("Error loading posts:", request.error);
  };
}

function createPostElement(post) {
  const postDiv = document.createElement("div");
  postDiv.classList.add("post");

  if (post.content) {
    const contentPara = document.createElement("p");
    contentPara.textContent = post.content;
    contentPara.classList.add("content");
    postDiv.appendChild(contentPara);
  }

  if (post.description) {
    const descriptionPara = document.createElement("p");
    descriptionPara.textContent = post.description;
    descriptionPara.classList.add("description");
    descriptionPara.classList.add("short-description"); // إضافة الفئة للعرض الجزئي
    postDiv.appendChild(descriptionPara);

    const readMoreLink = document.createElement("span");
    readMoreLink.textContent = "...قراءة المزيد";
    readMoreLink.classList.add("read-more");
    postDiv.appendChild(readMoreLink);

    readMoreLink.addEventListener("click", () => {
      descriptionPara.classList.toggle("short-description");
      readMoreLink.textContent = descriptionPara.classList.contains("short-description") ? "قراءة المزيد..." : "إغلاق";
    });
  }

  if (post.fileData) {
    if (post.fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = post.fileData;
      img.style.maxWidth = "100%";
      postDiv.appendChild(img);
    } else if (post.fileType.startsWith("video/")) {
      const videoElement = document.createElement("video");
      videoElement.src = post.fileData;
      videoElement.controls = true;
      videoElement.style.maxWidth = "100%";
      postDiv.appendChild(videoElement);
    } else if (post.fileType.startsWith("audio/")) {
      const audioElement = document.createElement("audio");
      audioElement.src = post.fileData;
      audioElement.controls = true;
      audioElement.style.maxWidth = "100%";
      postDiv.appendChild(audioElement);
    } else if (post.fileType === "application/pdf") {
      const pdfBlob = dataURLToBlob(post.fileData);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const pdfViewer = document.createElement("iframe");
      pdfViewer.src = pdfUrl;
      pdfViewer.width = "100%";
      pdfViewer.height = "400px";
      pdfViewer.style.border = "none";
      postDiv.appendChild(pdfViewer);
    } else {
      const fileLink = document.createElement("a");
      fileLink.href = post.fileData;
      fileLink.textContent = "عرض المستند";
      fileLink.target = "_blank";
      postDiv.appendChild(fileLink);
    }
  }

  if (post.link) {
    if (post.link.includes("youtube.com") || post.link.includes("youtu.be")) {
      const youtubeId = extractYouTubeID(post.link);
      if (youtubeId) {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${youtubeId}?modestbranding=1&showinfo=0&controls=1&rel=0`;
        iframe.width = "100%";
        iframe.height = "200px";
        iframe.style.border = "none";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        postDiv.appendChild(iframe);
      }
    } else {
      const linkPreview = document.createElement("iframe");
      linkPreview.src = post.link;
      linkPreview.width = "100%";
      linkPreview.height = "200px";
      linkPreview.style.border = "none";
      postDiv.appendChild(linkPreview);
    }
  }

  const deleteButton = document.createElement("button");
  deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
  deleteButton.classList.add("delete-button");
  deleteButton.addEventListener("click", () => deletePostWithConfirmation(post.id));

  const editButton = document.createElement("button");
  editButton.innerHTML = '<i class="fas fa-edit"></i>';
  editButton.classList.add("edit-button");
  editButton.style.display = "none"; // إخفاء زر التعديل بشكل افتراضي
  editButton.addEventListener("click", () => editPost(post));

  const buttonsDiv = document.createElement("div");
  buttonsDiv.classList.add("buttons-container");
  buttonsDiv.appendChild(deleteButton);
  buttonsDiv.appendChild(editButton);

  postDiv.appendChild(buttonsDiv);

  postDiv.addEventListener("click", () => {
    editButton.style.display = "inline-block"; // إظهار زر التعديل عند الضغط
  });

  postList.insertBefore(postDiv, postList.firstChild);
}

function deletePostWithConfirmation(postId) {
  postToDelete = postId;
  const deleteModal = document.getElementById("delete-modal");
  deleteModal.style.display = "flex";
}

document.getElementById("cancel-delete").addEventListener("click", () => {
  const deleteModal = document.getElementById("delete-modal");
  deleteModal.style.display = "none";
  postToDelete = null;
});

document.getElementById("confirm-delete").addEventListener("click", () => {
  if (postToDelete !== null) {
    const transaction = db.transaction("posts", "readwrite");
    const store = transaction.objectStore("posts");
    const request = store.delete(postToDelete);

    request.onsuccess = () => {
      postList.innerHTML = '';
      loadPostsFromIndexedDB();
    };

    request.onerror = () => {
      console.error("Error deleting post:", request.error);
    };

    postToDelete = null;
    document.getElementById("delete-modal").style.display = "none";
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataURLToBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function extractYouTubeID(url) {
  const regExp = /(?:youtube.com\/.*v=|youtu.be\/)([^&\n?#]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

addPostButton.addEventListener("click", async () => {
  const content = contentInput.value.trim();
  const description = descriptionInput.value.trim(); // الحصول على وصف المنشور
  const file = fileInput.files[0];
  const link = linkInput.value.trim();

  if (content || description || file || link) {
    let fileData = null;
    let fileType = null;

    if (file) {
      fileData = await fileToBase64(file);
      fileType = file.type;
    }

    const post = {
      id: postToEdit || Date.now(),
      content,
      description, // إضافة الوصف
      fileData,
      fileType,
      link: link || null,
      likes: 0,
      comments: []
    };

    if (postToEdit) {
      const transaction = db.transaction("posts", "readwrite");
      const store = transaction.objectStore("posts");
      const request = store.put(post);

      request.onsuccess = () => {
        loadPostsFromIndexedDB();
      };

      request.onerror = () => {
        console.error("Error updating post:", request.error);
      };

      postToEdit = null;
    } else {
      savePostToIndexedDB(post);
      createPostElement(post);
    }

    contentInput.value = '';
    descriptionInput.value = ''; // مسح الوصف
    fileInput.value = '';
    linkInput.value = '';
  } else {
    alert("يرجى كتابة محتوى أو رفع ملف أو إضافة رابط قبل النشر.");
  }
});

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  filterPosts(query);
});

function filterPosts(query) {
  const transaction = db.transaction("posts", "readonly");
  const store = transaction.objectStore("posts");
  const request = store.getAll();

  request.onsuccess = () => {
    const posts = request.result;
    const filteredPosts = posts.filter(post => {
      return post.content.toLowerCase().includes(query) || (post.link && post.link.toLowerCase().includes(query));
    });
    postList.innerHTML = '';
    filteredPosts.forEach(post => createPostElement(post));
  };
}

function editPost(post) {
  contentInput.value = post.content || '';
  descriptionInput.value = post.description || ''; // تعبئة الوصف
  linkInput.value = post.link || '';
  fileInput.value = ''; // لا يمكن تعبئة الملف بشكل مباشر في input

  postToEdit = post.id;
}

document.addEventListener("click", (event) => {
  const editButtons = document.querySelectorAll(".edit-button");
  editButtons.forEach(button => {
    if (!button.closest(".post").contains(event.target)) {
      button.style.display = "none";
    }
  });
});
