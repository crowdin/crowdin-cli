package com.crowdin.cli.utils;

import java.io.Console;

/**
 * Created by ihor on 10/28/16.
 */
public class ConsoleSpinner {

    int counter;

    public void turn()
    {
        counter++;
        switch (counter % 4)
        {
            case 0:
                System.out.print("/");
                counter = 0;
                break;
            case 1:
                System.out.print("-");
                break;
            case 2:
                System.out.print("\\");
                break;
            case 3:
                System.out.print("|");
                break;
        }
        System.out.print("\b");
        try {
            Thread.sleep(150);
        } catch (InterruptedException e) {

        }
    }
}
