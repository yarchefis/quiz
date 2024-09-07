const firebaseConfig = {
    apiKey: "AIzaSyC0HRay6-aZeGMWDacTWZe5UutG9dhPznE",
    authDomain: "tests-be00f.firebaseapp.com",
    databaseURL: "https://tests-be00f-default-rtdb.firebaseio.com",
    projectId: "tests-be00f",
    storageBucket: "tests-be00f.appspot.com",
    messagingSenderId: "566141226562",
    appId: "1:566141226562:web:0a4c9e8866b747be1e67db",
    measurementId: "G-7F29PR9KR9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Login function
document.getElementById('loginForm').onsubmit = function(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorAlert = document.getElementById('error-alert');

    // Clear previous error
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log('User logged in:', user);
            window.location.href = 'admin.html';
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error('Error:', errorCode);

            // Show a custom error message for invalid login credentials
            if (errorCode === 'auth/invalid-login-credentials') {
                errorAlert.style.display = 'block';
                errorAlert.textContent = 'Неверный email или пароль. Попробуйте снова.';
            }
        });
};
