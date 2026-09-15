import httpx

with httpx.Client() as client:
    response = client.post("http://127.0.0.1:8001/login", data={"username": "admin", "password": "agiltampan"}, follow_redirects=False)
    print("Login:", response.status_code)
    cookie = response.cookies.get("edteknoguard_session")
    
    resp2 = client.get("http://127.0.0.1:8001/users/", cookies={"edteknoguard_session": cookie})
    print("Users:", resp2.status_code)
    print(resp2.text)
