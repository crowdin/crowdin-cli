echo "Checking JAVA installation..."
copySuccessed=1

if type -p java; then
    _java=java
elif [[ -n "$JAVA_HOME" ]] && [[ -x "$JAVA_HOME/bin/java" ]];  then
    _java="$JAVA_HOME/bin/java"
else
    echo "Looks like JAVA is not installed. You can download it from https://www.java.com/"
fi

if [[ "$_java" ]]; then
    echo "Checking JAVA version..."

    version=$("$_java" -version 2>&1 | awk -F '"' '/version/ {print $2}')

    if [[ "$version" > "1.8" ]]; then
        echo Your Java version is "$version" - OK

        echo "Installing Crowdin CLI..."

        sudo cp crowdin-cli.jar /usr/local/bin

        copySuccessed=$?

        printf "\nalias crowdin='java -jar /usr/local/bin/crowdin-cli.jar'\n" >> ~/.bashrc
        printf "\nalias crowdin='java -jar /usr/local/bin/crowdin-cli.jar'\n" >> ~/.bash_profile

        [ -d "/etc/bash_completion.d" ] && sudo cp crowdin_completion /etc/bash_completion.d/crowdin_completion
        [ -d "/usr/local/etc/bash_completion.d" ] && sudo cp crowdin_completion /usr/local/etc/bash_completion.d/crowdin_completion

        if [ -f ~/.bashrc ]; then
            . ~/.bashrc
        fi

        if [ -f ~/.bash_profile ]; then
            . ~/.bash_profile
        fi
    else
        echo Your Java version is "$version" - needs to be updated. You can download it from https://www.java.com/
    fi
fi

if [ $copySuccessed -ne 0 ]; then
    echo "Crowdin CLI not installed!"
else
    echo "Crowdin CLI installed!"
fi
