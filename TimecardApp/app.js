// TimecardApp/App.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';

const App = () => {
    const [organization, setOrganization] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://your-backend-url/api/auth/login', {
                organization,
                password
            });

            if (response.status === 200) {
                Alert.alert('Success', response.data.message);
                // Store the token and navigate to the next screen
            }
        } catch (error) {
            Alert.alert('Error', error.response.data.message || 'An error occurred.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Organization Login</Text>
            <TextInput
                style={styles.input}
                placeholder="Organization"
                value={organization}
                onChangeText={setOrganization}
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />
            <Button title="Login" onPress={handleLogin} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex:1,
        justifyContent:'center',
        padding:20,
    },
    title: {
        fontSize:24,
        marginBottom:20,
        textAlign:'center'
    },
    input: {
        height:40,
        borderColor:'#ccc',
        borderWidth:1,
        marginBottom:15,
        paddingHorizontal:10
    }
});

export default App;