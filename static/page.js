const signUp = document.querySelector(".log");
const signUpDiv = document.querySelector(".signupDiv");
const getBottleButton = document.querySelector(".getBottle");
const cratesDiv = document.querySelector(".bottleDiv");
const anotherBottle = document.querySelector(".anotherBottle");

signUp.addEventListener("click", () => {
  signUpDiv.classList.remove("hidden");
  signUp.classList.add("hidden");

  console.log("you clicked the logIn button");
});

getBottleButton.addEventListener("click", () => {
  signUpDiv.classList.add("hidden");
  signUp.classList.add("hidden");

  cratesDiv.classList.remove("hidden");
  anotherBottle.classList.remove("hidden");
});
