package com.crowdin.cli.utils.tree;

import com.crowdin.cli.utils.tree.interfaces.Visitor;

/**
 * @author ihor
 */
public class PrintIndentedVisitor implements Visitor<String> {
    private final int indent;

    PrintIndentedVisitor(int indent) {
        this.indent = indent;
    }

    @Override
    public Visitor<String> visitTree(Tree<String> tree) {
        return new PrintIndentedVisitor(indent + 1);
    }

    @Override
    public void visitData(Tree<String> parent, String data) {
        for (int i = 0; i < indent - 1; i++) {
            System.out.print("│  ");
        }
        if (!".".equals(data) && !"".equals(data)) {
            System.out.print("├─ ");
            System.out.println(data);
        }
    }
}
