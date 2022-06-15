const signUp = document.querySelector(".log");
const signUpDiv = document.querySelector(".signupDiv");
const getBottleButton = document.querySelector(".getBottle");
const cratesDiv = document.querySelector(".cratesDiv");

signUp.addEventListener("click", () => {
  signUpDiv.classList.remove("hidden");
  console.log("you clicked the logIn button");
});

getBottleButton.addEventListener("click", () => {
  signUpDiv.classList.add("hidden");
  cratesDiv.classList.remove("hidden");
});
