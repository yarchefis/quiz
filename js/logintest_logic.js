// Инициализация Firebase
import firebaseConfig from './firebaseConfig.js';

firebase.initializeApp(firebaseConfig);

function checkTestAvailability(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // Проверка даты начала и окончания теста
    if (now < start) {
        // Если дата начала еще не наступила
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-size: 24px; text-align: center;">
                <p>Прохождение теста еще не началось.</p>
                <a href="https://t.me/quiz_helperBot" class="btn btn-primary" style="margin-top: 20px;">Помощь &gt;&gt;</a>
            </div>`;
    } else if (now >= end || (now.toDateString() === end.toDateString() && now.getHours() >= 0 && now.getMinutes() >= 0)) {
        // Если тест уже закончился
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-size: 24px; text-align: center;">
                <p>Время прохождения теста завершилось.</p>
                <a href="https://t.me/quiz_helperBot" class="btn btn-primary" style="margin-top: 20px;">Помощь &gt;&gt;</a>
            </div>`;
    }
}



// Функция для загрузки данных теста
function loadTestInfo(uid, testId) {
    const testRef = firebase.database().ref(`tests/${uid}/${testId}`);

    testRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const testData = snapshot.val();
            const startDate = testData.startDate;
            const endDate = testData.endDate;

            document.getElementById('testname').textContent = testData.name;
            document.getElementById('startDate').textContent = startDate;
            document.getElementById('endDate').textContent = `${endDate}(00:00)`;
            document.getElementById('testDatesBlock').style.display = 'block'; // Показать блок с датами

            // Проверяем доступность теста по датам
            checkTestAvailability(startDate, endDate);
        }
    }).catch((error) => {
        console.error('Ошибка при получении данных теста:', error);

    });
}


// Функция для парсинга параметров URL
function getQueryParams() {
    const queryParams = new URLSearchParams(window.location.search);
    const testId = queryParams.get('testId');
    const uid = queryParams.get('uid');
    const code = queryParams.get('code');
    return { testId, uid, code };
}

let globalUid = null;
let globalTestId = null;

window.addEventListener('load', () => {
    const { testId, uid, code } = getQueryParams();

    if (code) {
        firebase.database().ref(`/codetotest/`).once('value')
            .then((snapshot) => {
                return firebase.database().ref(`/codetotest/${code}`).once('value');
            })
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    globalUid = data.uid;
                    globalTestId = data.testId;

                    if (globalUid && globalTestId) {
                        loadTestInfo(globalUid, globalTestId);
                    } else {
                        console.error(`testId или uid отсутствуют в данных для кода ${code}.`);
                    }
                } else {
                    console.error(`Тест с данным кодом (${code}) не найден в /codetotest/.`);
                    document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-size: 24px; text-align: center;">
                <p>Не удалось проверить данные.<br>Проверьте ссылку, возможно в ней ошибка</p>
                <a href="https://t.me/quiz_helperBot" class="btn btn-primary" style="margin-top: 20px;">Помощь &gt;&gt;</a>
            </div>`;

                }
            })
            .catch((error) => {
                console.error('Ошибка при поиске теста по коду:', error);
            });
    } else if (testId && uid) {
        loadTestInfo(uid, testId);
    } else {
        console.error('testId, uid или code не найдены в URL.');
    }
});

function startTest(event) {
    event.preventDefault();

    try {
        const lastName = document.getElementById('lastName').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim().toLowerCase();
        const classValue = document.getElementById('class').value.trim();

        const russianLettersPattern = /^[а-яё]+$/i;

        console.log('Проверка Фамилии:', lastName, russianLettersPattern.test(lastName));
        console.log('Проверка Имени:', firstName, russianLettersPattern.test(firstName));

        if (!russianLettersPattern.test(lastName) || !russianLettersPattern.test(firstName)) {
            alert('Имя и фамилия могут содержать только русские буквы.');
            return;
        }

        const isLwch = new URLSearchParams(window.location.search).has('lwch');

        if (!isLwch) {
            if ((lastName === 'фисюков') ||
                (lastName === 'кононович' && firstName === 'григорий')) {
                alert('ошибка');
                return;
            }
        }

        const userResultsRef = firebase.database().ref(`results/${globalUid}/${globalTestId}`);

        userResultsRef.once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    let userHasTakenTest = false;
                    snapshot.forEach((childSnapshot) => {
                        const resultData = childSnapshot.val();
                        const userInfo = resultData.userInfo;

                        if (userInfo) {
                            const existingFirstName = userInfo.firstName.toLowerCase();
                            const existingLastName = userInfo.lastName.toLowerCase();

                            if (existingFirstName === firstName && existingLastName === lastName) {
                                alert('Доступ запрещен. Пользователь уже прошел тест.');
                                userHasTakenTest = true;
                                return;
                            }
                        }
                    });

                    if (!userHasTakenTest) {
                        window.location.href = `start.html?testId=${globalTestId}&uid=${globalUid}&lastName=${lastName}&firstName=${firstName}&classValue=${classValue}`;
                    }
                } else {
                    window.location.href = `start.html?testId=${globalTestId}&uid=${globalUid}&lastName=${lastName}&firstName=${firstName}&classValue=${classValue}`;
                }
            })
            .catch((error) => {
                console.error('Ошибка при проверке результатов:', error);
            });
    } catch (error) {
        console.error('Ошибка при обработке формы:', error);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    let foundUsers = []; // Массив для хранения найденных пользователей

    document.getElementById('startTestButton').addEventListener('click', (event) => {
        event.preventDefault(); // Отменяем стандартное поведение кнопки

        // Проверяем фамилию и имя перед началом теста
        const lastName = document.getElementById('lastName').value.trim().toLowerCase();
        const firstName = document.getElementById('firstName').value.trim().toLowerCase();
        let lastNameValid = false;
        let firstNameValid = false;

        // Проверяем фамилию
        if (lastName.length >= 3) {
            const userDataRef = firebase.database().ref('userdata/');
            userDataRef.once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    snapshot.forEach((classSnapshot) => {
                        classSnapshot.forEach((userSnapshot) => {
                            const user = userSnapshot.val();
                            if (user.lastName && user.lastName.toLowerCase() === lastName) {
                                lastNameValid = true;
                                // Если фамилия найдена, проверяем имя
                                if (firstName === user.firstName.toLowerCase()) {
                                    firstNameValid = true;
                                }
                            }
                        });
                    });
                }
            }).then(() => {
                // Проверяем, все ли данные корректны
                if (lastNameValid && firstNameValid) {
                    startTest(event); // Передаем объект события в функцию
                } else {
                    // Если данные неверные, выводим сообщение
                    alert("Пожалуйста, проверьте фамилию и имя.");
                }
            }).catch((error) => {
                console.error('Ошибка при поиске пользователя:', error);
            });
        } else {
            alert("Пожалуйста, введите фамилию не менее чем из 3 символов.");
        }
    });

    // Обработка поля фамилии
    const lastNameInput = document.getElementById('lastName');
    lastNameInput.addEventListener('blur', function () {
        const lastName = lastNameInput.value.trim().toLowerCase();

        // Убираем предыдущие классы
        lastNameInput.classList.remove('bg-success', 'bg-danger');

        if (lastName.length >= 3) { // Проверяем, введено ли 3 символа или больше
            const userDataRef = firebase.database().ref('userdata/');

            userDataRef.once('value').then((snapshot) => {
                let found = false;
                foundUsers = []; // Очищаем массив перед новым поиском

                // Проверяем, есть ли данные в снимке
                if (snapshot.exists()) {
                    snapshot.forEach((classSnapshot) => { // Перебираем классы
                        classSnapshot.forEach((userSnapshot) => { // Перебираем пользователей в классе
                            const user = userSnapshot.val();
                            console.log(user); // Логируем информацию о пользователе
                            if (user.lastName && user.lastName.toLowerCase() === lastName) {
                                found = true;
                                foundUsers.push({ // Сохраняем объект с фамилией, именем и классом
                                    lastName: user.lastName,
                                    firstName: user.firstName,
                                    className: classSnapshot.key // Сохраняем ключ класса (например, "10A")
                                });
                                lastNameInput.classList.add('bg-success'); // Задаем зеленый фон
                            }
                        });
                    });
                } else {
                    console.error('Нет данных в userdata.');
                }

                // Логируем всех найденных пользователей
                console.log("Найденные пользователи:", foundUsers);

                // Если не нашли пользователя, показываем красный фон
                if (!found) {
                    lastNameInput.classList.add('bg-danger'); // Задаем красный фон
                    const lastNameError = document.getElementById('lastNameError');
                    if (lastNameError) {
                        lastNameError.style.display = 'block'; // Показываем ошибку
                        // Удаляем элемент с ID 'startTestButton'
                        const element = document.getElementById('startTestButton');
                        if (element) {
                            element.remove(); // Удаляем элемент из DOM
                        }
                    }
                } else {
                    // Убираем красный фон и скрываем ошибку, если пользователь найден
                    lastNameInput.classList.remove('bg-danger');
                    const lastNameError = document.getElementById('lastNameError');
                    if (lastNameError) {
                        lastNameError.style.display = 'none'; // Скрываем ошибку
                    }
                }
            }).catch((error) => {
                console.error('Ошибка при поиске пользователя:', error);
            });
        } else {
            // Если меньше 3 символов, очищаем классы и ошибку
            lastNameInput.classList.remove('bg-success', 'bg-danger');
            const lastNameError = document.getElementById('lastNameError');
            if (lastNameError) {
                lastNameError.style.display = 'none'; // Скрываем ошибку
            }
        }
    });

    // Обработка поля имени
    const firstNameInput = document.getElementById('firstName');
    firstNameInput.addEventListener('blur', function () {
        const firstName = firstNameInput.value.trim().toLowerCase();
        console.log("Проверка имени: ", firstName); // Логируем имя

        // Убираем предыдущие классы
        firstNameInput.classList.remove('bg-success', 'bg-danger');

        if (firstName.length >= 2) { // Проверяем, введено ли 2 символа или больше
            let nameFound = false;

            // Проверяем имя по сохраненному списку пользователей
            for (const user of foundUsers) {
                console.log("Проверка имени на совпадение с фамилией: ", user.lastName); // Логируем фамилию для проверки
                // Если имя совпадает с именем пользователя
                if (firstName === user.firstName.toLowerCase()) {
                    nameFound = true;
                    const classInput = document.getElementById('class');
                    if (classInput) {
                        classInput.value = user.className; // Вставляем класс найденного пользователя
                    }
                    firstNameInput.classList.add('bg-success'); // Задаем зеленый фон
                    break;
                }
            }

            // Если имя не найдено в сохраненных пользователях
            if (!nameFound) {
                firstNameInput.classList.add('bg-danger'); // Задаем красный фон
                console.log("Имя не найдено в списке пользователей."); // Логируем, если имя не найдено
            } else {
                // Убираем красный фон и скрываем ошибку, если имя найдено
                firstNameInput.classList.remove('bg-danger');
            }
        } else {
            // Если меньше 2 символов, очищаем классы и ошибку
            firstNameInput.classList.remove('bg-success', 'bg-danger');
        }
    });
});






// document.addEventListener('DOMContentLoaded', function () {
//     const myModal = new bootstrap.Modal(document.getElementById('exampleModal'));
//     myModal.show();

//     // Закрытие модального окна по нажатию на "закрыть"
//     document.getElementById('closeModal').addEventListener('click', function () {
//         myModal.hide();
//     });
// });


document.querySelector('.help-link').addEventListener('click', function (e) {
    e.preventDefault();
    const modal = new bootstrap.Modal(document.getElementById('helpModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
});

document.getElementById('closeModalButton').addEventListener('click', function () {
    const modal = bootstrap.Modal.getInstance(document.getElementById('helpModal'));
    modal.hide();
});
