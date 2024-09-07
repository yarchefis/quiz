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
            testItem.className = 'test-item d-flex justify-content-between align-items-center';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'flex-grow-1';
            contentDiv.innerHTML = `
                <p>${test.name}</p>
                <p>Создан в: ${new Date(test.createdAt).toLocaleString()}</p>
            `;

            const link = document.createElement('a');
            link.href = `edittest.html?testId=${testId}`;
            link.appendChild(contentDiv);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger btn-sm ms-2'; // Added margin-start for spacing
            deleteButton.textContent = 'Удалить';
            deleteButton.onclick = () => deleteTest(testId);


            const buttonWrapper = document.createElement('div');
            buttonWrapper.className = 'd-flex align-items-center';
            buttonWrapper.appendChild(deleteButton);

            testItem.appendChild(link);
            testItem.appendChild(buttonWrapper);
            testsContainer.appendChild(testItem);
        }
    });
}


function deleteTest(testId) {
    if (confirm('Are you sure you want to delete this test?')) {
        firebase.database().ref('/tests/' + currentUser.uid + '/' + testId).remove()
            .then(() => {
                loadTests();
            })
            .catch((error) => {
                console.error('Error deleting test:', error);
                showAlertModal('Error', error.message);
            });
    }
}


// Показать модальное окно для смены пароля
function showChangePasswordModal() {
    const changePasswordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    changePasswordModal.show();
}

// Смена пароля
function changePassword() {
    const currentPassword = document.getElementById('currentPasswordInput').value;
    const newPassword = document.getElementById('newPasswordInput').value;
    const confirmPassword = document.getElementById('confirmPasswordInput').value;

    if (newPassword === confirmPassword) {
        const user = firebase.auth().currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);

        // Повторная аутентификация пользователя
        user.reauthenticateWithCredential(credential)
            .then(() => {
                // Если успешная повторная аутентификация, меняем пароль
                return user.updatePassword(newPassword);
            })
            .then(() => {
                showAlertModal('Успех', 'Пароль успешно изменен');
                const changePasswordModal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                changePasswordModal.hide();
            })
            .catch((error) => {
                console.error('Ошибка при смене пароля:', error);
                showAlertModal('Ошибка', error.message);
            });
    } else {
        showAlertModal('Ошибка', 'Пароли не совпадают');
    }
}

// Функция для показа модального окна с сообщением
function showAlertModal(title, message) {
    document.getElementById('alertModalLabel').innerText = title;
    document.getElementById('alertModalBody').innerText = message;
    const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
    alertModal.show();
}
