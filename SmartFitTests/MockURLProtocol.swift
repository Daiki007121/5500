//
//  MockURLProtocol.swift
//  SmartFitTests
//
//  Created by Edwin Yu
//

import Foundation

class MockURLProtocol: URLProtocol {

    static var mockResponses: [URL: (data: Data?, response: HTTPURLResponse?, error: Error?)] = [:]

    override class func canInit(with request: URLRequest) -> Bool {
        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let url = request.url,
              let mock = MockURLProtocol.mockResponses[url] else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }

        if let error = mock.error {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }

        if let response = mock.response {
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        }

        if let data = mock.data {
            client?.urlProtocol(self, didLoad: data)
        }

        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {
        // Nothing to do here
    }

    static func reset() {
        mockResponses.removeAll()
    }

    static func mockLoginSuccess(url: URL) {
        let json = """
        {
            "message": "Login successful",
            "user": {
                "id": "mock-user-id-123",
                "name": "Mock User",
                "email": "mock@example.com"
            }
        }
        """
        let data = json.data(using: .utf8)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )
        mockResponses[url] = (data, response, nil)
    }

    static func mockLoginFailure(url: URL) {
        let json = """
        {
            "message": "Invalid email or password"
        }
        """
        let data = json.data(using: .utf8)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 401,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )
        mockResponses[url] = (data, response, nil)
    }

    static func mockRegisterSuccess(url: URL) {
        let json = """
        {
            "message": "User successfully created!"
        }
        """
        let data = json.data(using: .utf8)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 201,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )
        mockResponses[url] = (data, response, nil)
    }

    static func mockRegisterFailure(url: URL) {
        let json = """
        {
            "message": "Email already in use. Please use another email"
        }
        """
        let data = json.data(using: .utf8)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 400,
            httpVersion: nil,
            headerFields: ["Content-Type": "application/json"]
        )
        mockResponses[url] = (data, response, nil)
    }
}
