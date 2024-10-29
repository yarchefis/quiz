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
    const classId = document.getElementById('classSelect').value;

    if (testName && classId) {
        const testId = firebase.database().ref().child('tests').push().key;
        const randomNumber = Math.floor(10000000 + Math.random() * 90000000);

        const testData = {
            name: testName,
            createdAt: new Date().toISOString(),
            testCode: randomNumber,
            class: classId // Сохраняем класс как отдельное поле
        };

        const updates = {};
        // Сохраняем тест в привычном пути /tests/{uid}/{testId}
        updates[`/tests/${currentUser.uid}/${testId}`] = testData;

        // Добавляем данные в путь /codetotest/{testCode} для быстрого доступа
        updates[`/codetotest/${randomNumber}`] = {
            uid: currentUser.uid,
            testId: testId,
            classId: classId // Также сохраняем класс
        };

        firebase.database().ref().update(updates)
            .then(() => {
                loadTests(classId); // Загружаем тесты для выбранного класса
                const addTestModal = bootstrap.Modal.getInstance(document.getElementById('addTestModal'));
                addTestModal.hide();
            })
            .catch((error) => {
                console.error('Error adding test:', error);
                showAlertModal('Error', error.message);
            });
    }
}





function loadTests(classId) {
    const testsRef = firebase.database().ref('/tests/' + currentUser.uid);

    testsRef.once('value', (snapshot) => {
        const tests = snapshot.val();
        const testsContainer = document.getElementById('testsContainer');
        testsContainer.innerHTML = '';

        if (tests) {
            const classes = [
                '11гр1', '11гр2', '11гр3',
                '10гр1', '10гр2', '10гр3',
                '9а', '9б', '9в', '9д', '9п',
                '8а', '8б', '8в', '8п'
            ];

            // Определяем порядок сортировки классов
            const classOrder = {};
            classes.forEach((className, index) => {
                classOrder[className] = index;
            });

            // Фильтруем тесты по классу, если classId передан и не равен 'all'
            const filteredTests = classId && classId !== 'all' ? 
                Object.entries(tests).filter(([testId, test]) => test.class === classId) :
                Object.entries(tests).sort(([testIdA, testA], [testIdB, testB]) => {
                    const classAOrder = classOrder[testA.class] || Infinity; // По умолчанию ставим Infinity, если класс не найден
                    const classBOrder = classOrder[testB.class] || Infinity;
                    return classAOrder - classBOrder; // Сортировка от высшего к низшему
                });

            if (filteredTests.length > 0) {
                filteredTests.forEach(([testId, test]) => {
                    const testItem = document.createElement('div');
                    testItem.className = 'test-item d-flex justify-content-between align-items-center';

                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'flex-grow-1';
                    contentDiv.innerHTML = `<p>${test.name}</p>`;

                    const link = document.createElement('a');
                    link.href = `edittest.html?testId=${testId}`;
                    link.appendChild(contentDiv);

                    // Кнопка удаления
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'btn btn-danger btn-sm ms-2';
                    deleteButton.textContent = 'Удалить';
                    deleteButton.onclick = () => deleteTest(testId, test.class);

                    // Кнопка дублирования
                    const duplicateButton = document.createElement('button');
                    duplicateButton.className = 'btn btn-primary btn-sm ms-2';
                    duplicateButton.textContent = 'Дублировать';
                    duplicateButton.onclick = () => duplicateTest(testId, test.name, test.class);

                    // Кнопка переименования
                    const renameButton = document.createElement('button');
                    renameButton.className = 'btn btn-secondary btn-sm ms-2';
                    renameButton.textContent = 'Изменить';
                    renameButton.onclick = () => showRenameTestModal(testId, test.name, test.class);

                    // Кнопка результатов
                    const resultsButton = document.createElement('button');
                    resultsButton.className = 'btn btn-info btn-sm ms-2';
                    resultsButton.textContent = 'Результаты';
                    resultsButton.onclick = () => {
                        const uid = currentUser.uid;
                        window.location.href = `print.html?uid=${uid}&testId=${testId}`;
                    };

                    const buttonWrapper = document.createElement('div');
                    buttonWrapper.className = 'd-flex align-items-center';
                    buttonWrapper.appendChild(deleteButton);
                    buttonWrapper.appendChild(duplicateButton);
                    buttonWrapper.appendChild(renameButton);
                    buttonWrapper.appendChild(resultsButton);

                    testItem.appendChild(link);
                    testItem.appendChild(buttonWrapper);
                    testsContainer.appendChild(testItem);
                });
            } else {
                testsContainer.innerHTML = '<p>Тесты для данного класса отсутствуют.</p>';
            }
        } else {
            testsContainer.innerHTML = '<p>Тесты отсутствуют.</p>';
        }
    });
}







let testIdToRename = null;

function showRenameTestModal(testId, currentName, currentClass) {
    testIdToRename = testId;
    document.getElementById('renameTestInput').value = currentName;
    document.getElementById('classSelectRename').value = currentClass || ''; // Устанавливаем текущий класс
    const renameTestModal = new bootstrap.Modal(document.getElementById('renameTestModal'));
    renameTestModal.show();
}

function renameTest() {
    const newTestName = document.getElementById('renameTestInput').value;
    const newClass = document.getElementById('classSelectRename').value;

    if (newTestName && testIdToRename) {
        const updates = {};
        updates[`/tests/${currentUser.uid}/${testIdToRename}/name`] = newTestName;
        updates[`/tests/${currentUser.uid}/${testIdToRename}/class`] = newClass;

        const testRef = firebase.database().ref(`/tests/${currentUser.uid}/${testIdToRename}`);

        testRef.once('value').then((snapshot) => {
            if (snapshot.exists()) {
                const testData = snapshot.val();
                let testCode = testData.testCode;

                if (!testCode) {
                    testCode = Math.floor(10000000 + Math.random() * 90000000).toString();
                    updates[`/tests/${currentUser.uid}/${testIdToRename}/testCode`] = testCode;
                }

                const codeRef = firebase.database().ref(`/codetotest/${testCode}`);
                codeRef.once('value').then((codeSnapshot) => {
                    if (!codeSnapshot.exists()) {
                        updates[`/codetotest/${testCode}`] = {
                            uid: currentUser.uid,
                            testId: testIdToRename
                        };
                    }

                    return firebase.database().ref().update(updates);
                }).then(() => {
                    loadTests(newClass); // Обновляем тесты для нового выбранного класса
                    const renameTestModal = bootstrap.Modal.getInstance(document.getElementById('renameTestModal'));
                    renameTestModal.hide();
                    showAlertModal('Успех', 'Имя и класс теста успешно изменены');
                }).catch((error) => {
                    console.error('Ошибка при изменении имени теста:', error);
                    showAlertModal('Ошибка', error.message);
                });
            } else {
                console.error('Тест не найден для изменения имени.');
                showAlertModal('Ошибка', 'Тест не найден.');
            }
        }).catch((error) => {
            console.error('Ошибка при получении данных теста:', error);
        });
    }
}






function deleteTest(testId) {
    if (confirm('Вы уверены, что хотите удалить этот тест? Это действие нельзя отменить.')) {
        // Сначала получаем testCode, чтобы знать, что удалять из /codetotest/
        const testRef = firebase.database().ref('/tests/' + currentUser.uid + '/' + testId);
        
        testRef.once('value').then((snapshot) => {
            const testData = snapshot.val();
            const testCode = testData ? testData.testCode : null; // Получаем testCode
            
            // Удаляем тест из ветки tests
            return testRef.remove().then(() => {
                // Затем удаляем все связанные вопросы из ветки questions
                const questionsRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + testId);
                return questionsRef.remove();
            }).then(() => {
                // Удаляем testCode из /codetotest/
                if (testCode) {
                    const codetotestRef = firebase.database().ref('/codetotest/' + testCode);
                    return codetotestRef.remove();
                }
            }).then(() => {
                // Обновляем список тестов после удаления
                loadTests();
                showAlertModal('Успех', 'Тест и связанные с ним вопросы успешно удалены');
            });
        })
        .catch((error) => {
            console.error('Ошибка при удалении теста и вопросов:', error);
            showAlertModal('Ошибка', error.message);
        });
    }
}



// Функция для дублирования теста
function duplicateTest(originalTestId) {
    // Получаем данные оригинального теста
    const originalTestRef = firebase.database().ref('/tests/' + currentUser.uid + '/' + originalTestId);
    originalTestRef.once('value', (snapshot) => {
        const originalTest = snapshot.val();

        // Создаем новый тест с новым testId
        const newTestId = firebase.database().ref().child('tests').push().key;

        // Генерация нового случайного набора цифр из 8 символов для нового теста
        const newTestCode = Math.floor(10000000 + Math.random() * 90000000);

        const newTestData = {
            ...originalTest, // Копируем данные теста
            name: originalTest.name + ' (Копия)', // Меняем название
            createdAt: new Date().toISOString(),  // Обновляем дату создания
            testCode: newTestCode // Добавляем новый testCode
        };

        // Сохраняем новый тест в базе данных
        const updates = {};
        updates['/tests/' + currentUser.uid + '/' + newTestId] = newTestData;

        // Копируем вопросы из оригинального теста
        const originalQuestionsRef = firebase.database().ref('/questions/' + currentUser.uid + '/' + originalTestId);
        originalQuestionsRef.once('value', (questionsSnapshot) => {
            const questions = questionsSnapshot.val();
            if (questions) {
                // Для каждого вопроса создаем новый уникальный ключ
                for (const questionId in questions) {
                    const newQuestionId = firebase.database().ref().child('questions').push().key;
                    updates['/questions/' + currentUser.uid + '/' + newTestId + '/' + newQuestionId] = questions[questionId];
                }
            }

            // Добавляем новый testCode в /codetotest/
            updates['/codetotest/' + newTestCode] = {
                uid: currentUser.uid,
                testId: newTestId
            };

            // Выполняем обновление базы данных
            firebase.database().ref().update(updates)
                .then(() => {
                    loadTests();
                    showAlertModal('Успех', 'Тест успешно дублирован');
                })
                .catch((error) => {
                    console.error('Ошибка при обновлении базы данных:', error);
                    showAlertModal('Ошибка', error.message);
                });
        });
    });
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
