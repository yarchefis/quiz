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

let currentUser;

// Check if user is logged in
firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        console.log('User is logged in:', user);
        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;
        loadTests();
    }
});

// Logout function
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Error logging out:', error);
        showAlertModal('Error', error.message);
    });
}

// Show add test modal
function showAddTestModal() {
    const addTestModal = new bootstrap.Modal(document.getElementById('addTestModal'));
    addTestModal.show();
}

// Add test function
function addTest() {
    const testName = document.getElementById('testNameInput').value;
    if (testName) {
        const testId = firebase.database().ref().child('tests').push().key;
        const testData = {
            name: testName,
            createdAt: new Date().toISOString()
        };
        const updates = {};
        updates['/tests/' + currentUser.uid + '/' + testId] = testData;
        firebase.database().ref().update(updates)
            .then(() => {
                loadTests();
                const addTestModal = bootstrap.Modal.getInstance(document.getElementById('addTestModal'));
                addTestModal.hide();
                showAlertModal('Success', 'Test added successfully!');
            })
            .catch((error) => {
                console.error('Error adding test:', error);
                showAlertModal('Error', error.message);
            });
    }
}

// Load tests function
function loadTests() {
    const testsRef = firebase.database().ref('/tests/' + currentUser.uid);
    testsRef.once('value', (snapshot) => {
        const tests = snapshot.val();
        const testsContainer = document.getElementById('testsContainer');
        testsContainer.innerHTML = '';
        for (const testId in tests) {
            const test = tests[testId];
            const testItem = document.createElement('div');
            testItem.className = 'test-item';

            const link = document.createElement('a');
            link.href = `edittest.html?testId=${testId}`;
            link.innerHTML = `
                <div>
                    <p>${test.name}</p>
                    <p>Created At: ${new Date(test.createdAt).toLocaleString()}</p>
                </div>
            `;

            testItem.appendChild(link);
            testsContainer.appendChild(testItem);
        }
    });
}

// Show alert modal function
function showAlertModal(title, message) {
    const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    document.getElementById('alertModalLabel').textContent = title;
    document.getElementById('alertModalBody').textContent = message;
    alertModal.show();
}
